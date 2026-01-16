# Thinkus 项目开发规范

> Claude Code 开发此项目时必须遵守的规则

---

## 项目概述

- **项目名称**: Thinkus
- **定位**: AI驱动的创业成功平台
- **愿景**: 让任何人都能把想法变成产品

---

## 技术栈

```yaml
前端:
  - Next.js 14 (App Router)
  - TypeScript 5
  - Tailwind CSS 3
  - shadcn/ui
  - Zustand (状态管理)
  - TanStack Query + tRPC

后端 (微服务架构):
  主服务 (Node.js):
    - tRPC API路由
    - NextAuth认证
    - Memory/Executive服务

  Python微服务 (FastAPI + gRPC):
    - DocumentProcessor (文档处理)
    - RequirementIntegrator (需求整合)
    - GrowthAdvisor (增长建议)
    - ExperienceService (经验库)

  Go Analytics微服务 (Gin + gRPC):
    - AnalyticsService (数据分析)
    - RealtimeStream (实时推送)

  Go Sandbox微服务 (Gin + gRPC):
    - SandboxManager (容器管理)

数据存储:
  - MongoDB (Mongoose)
  - Redis (缓存+消息)
  - Pinecone (向量搜索)

AI:
  - Anthropic Claude API
  - Model: Claude Opus/Sonnet/Haiku
  - OpenAI Embeddings

部署:
  - Docker Compose (微服务编排)
  - Vercel (前端)
  - MongoDB Atlas
  - Cloudflare (CDN)
```

---

## 目录结构

```
thinkus/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── (auth)/             # 认证相关页面
│   │   ├── (main)/             # 主要页面
│   │   │   ├── create/         # 创建流程 (idea/discuss/confirm/success)
│   │   │   ├── projects/       # 项目管理
│   │   │   │   └── [id]/       # 项目详情/进度/完成/分析/资产
│   │   │   ├── settings/       # 设置页面
│   │   │   └── templates/      # 模板市场
│   │   ├── api/                # API路由
│   │   │   ├── chat/           # 对话API
│   │   │   ├── discuss/        # 讨论API
│   │   │   ├── checkout/       # 支付API
│   │   │   └── webhooks/       # Webhook处理
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                 # shadcn/ui组件
│   │   ├── chat/               # 对话相关
│   │   ├── expert/             # 专家头像、消息
│   │   └── project/            # 项目相关 (product-type-selector)
│   ├── lib/
│   │   ├── trpc/               # tRPC配置
│   │   ├── db/                 # 数据库
│   │   ├── auth/               # 认证
│   │   ├── ai/                 # AI相关
│   │   ├── stripe/             # Stripe配置
│   │   ├── config/             # 配置 (product-types)
│   │   └── utils/
│   ├── hooks/                  # React hooks
│   └── types/                  # 类型定义
├── prompts/                    # 提示词文件
├── thinkus-docs/               # 项目文档
└── CLAUDE.md                   # 本文件
```

---

## 开发规范

### 代码风格

```yaml
命名规范:
  文件: kebab-case (例: user-profile.tsx)
  组件: PascalCase (例: UserProfile)
  函数: camelCase (例: getUserById)
  常量: UPPER_SNAKE_CASE (例: API_BASE_URL)
  类型/接口: PascalCase (例: UserProfile)

文件组织:
  - 每个组件一个文件
  - 相关组件放同一目录
  - 导出使用 index.ts
```

### 提交规范

```yaml
格式: type(scope): message

类型:
  - feat: 新功能
  - fix: 修复bug
  - docs: 文档更新
  - style: 代码格式
  - refactor: 重构
  - test: 测试
  - chore: 构建/工具

示例:
  - feat(auth): add Google OAuth login
  - fix(chat): resolve message ordering issue
  - docs(readme): update installation guide
```

---

## 文档参考

开发时请参考以下文档:

```yaml
核心文档:
  - thinkus-docs/INDEX.md          # 文档索引
  - thinkus-docs/PRD.md            # 产品需求
  - thinkus-docs/ARCHITECTURE.md   # 技术架构
  - thinkus-docs/BOOTSTRAP.md      # 开发启动指南

规格定义:
  - thinkus-docs/specs/data-models.ts   # 数据模型
  - thinkus-docs/specs/api-specs.yaml   # API规格

页面规格:
  - thinkus-docs/pages/*.yaml      # 各页面详情

提示词:
  - thinkus-docs/prompts/          # AI提示词库
```

---

## 开发阶段

### Phase 1: 基础设施
- [x] 项目初始化
- [x] 数据库连接 (MongoDB)
- [x] 认证系统 (NextAuth)
- [x] tRPC配置
- [x] Claude API封装

### Phase 2: 核心对话
- [x] 登录/注册页面
- [x] 仪表盘页面
- [x] 创建项目页面
- [x] 小T对话组件 (流式响应)
- [x] Claude API集成 (SSE)
- [x] 实时功能识别

### Phase 3: 专家讨论
- [x] 专家角色配置 (Mike/Elena/David)
- [x] 专家讨论组件 (avatar/message/panel)
- [x] 讨论编排器 (多阶段流程)
- [x] 讨论API (SSE流式响应)
- [x] 讨论页面 (discuss)
- [x] 方案确认页面 (confirm)

### Phase 4: 支付和开发
- [x] Stripe配置 (lib/stripe/config)
- [x] Checkout API (api/checkout)
- [x] Webhook处理 (api/webhooks/stripe)
- [x] 支付成功页面 (success)
- [x] 开发进度页面 (progress)
- [x] 项目完成页面 (complete)

### Phase 2 完善: 项目管理和设置
- [x] 项目列表页面 (/projects)
- [x] 项目详情页面 (/projects/[id])
- [x] 设置页面布局 (/settings)
- [x] 个人资料设置 (/settings/profile)
- [x] API密钥管理 (/settings/credentials)
- [x] 通知设置 (/settings/notifications)
- [x] 外观设置 (/settings/appearance)
- [x] 定价页面 (/pricing)
- [x] 首页优化 (完整marketing页面)

### Phase 3 完善: 高级功能
- [x] 多产品类型支持 (lib/config/product-types)
- [x] 产品类型选择器 (components/project/product-type-selector)
- [x] 资产管理页面 (/projects/[id]/assets)
- [x] 数据分析页面 (/projects/[id]/analytics)
- [x] 模板市场页面 (/templates)
- [x] 模板详情页面 (/templates/[id])
- [x] 项目详情快速操作面板
- [x] 导航和页脚优化

### v12 升级: AI员工增强

#### Phase 0: 止血 (Token优化)
- [x] Artifact Model (lib/db/models/artifact.ts) - 工具产物存储
- [x] Session Summary Model (lib/db/models/session-summary.ts) - 会话摘要
- [x] Artifact Service (lib/services/artifact-service.ts) - Full存储+Compact摘要
- [x] Session Summary Service (lib/services/session-summary-service.ts) - 摘要生成
- [x] Memory Controller (lib/services/memory-controller.ts) - 智能判断是否需要记忆
- [x] Memory Injector 升级 - 集成智能增强 (smartEnhanceContext)
- [x] 服务层统一导出 (lib/services/index.ts)

#### Phase 1: 基础能力
- [x] 分层模型调度 (lib/ai/model-router.ts) - Haiku/Sonnet/Opus智能选择
- [x] 经验库基础版 (lib/db/models/experience.ts, lib/services/experience-service.ts)
- [x] 邀请系统优化 (lib/services/invitation-service.ts) - AI评分、贡献奖励、限时活动
- [x] AI模块统一导出 (lib/ai/index.ts)

#### Phase 2: 文档处理
- [x] DocumentProcessor (lib/services/document-processor.ts) - PDF/图片/Excel/Word多格式处理
- [x] Claude Vision 图片理解
- [x] RequirementIntegrator (lib/services/requirement-integrator.ts) - 需求整合和去重
- [x] 支持URL网页抓取

#### Phase 3: 沙盒和直播
- [x] SandboxManager (lib/services/sandbox-manager.ts) - Docker容器管理、文件操作、命令执行
- [x] RealtimeStreamService (lib/services/realtime-stream.ts) - 实时事件推送、SSE支持
- [x] 事件类型定义 (code_change/terminal_output/agent_status/progress等)

#### Phase 4: 运营闭环
- [x] AnalyticsEvent Model (lib/db/models/analytics-event.ts) - 事件存储、统计查询
- [x] AnalyticsService (lib/services/analytics-service.ts) - 数据统计、趋势分析、漏斗
- [x] GrowthAdvisor (lib/services/growth-advisor.ts) - AI增长建议、行业基准对比
- [x] 嵌入式统计代码生成 (generateTrackingScript)

---

## 关键决策

```yaml
技术选择:
  - 使用 App Router (不用 Pages Router)
  - 使用 Server Components (默认)
  - 客户端交互用 'use client'
  - API 用 tRPC (不用 REST)
  - 样式用 Tailwind (不用 CSS Modules)

AI调用:
  - 对话用流式 (streaming)
  - 生成用非流式
  - 模型选择见 prompts 配置
```

---

## 环境变量

```bash
# 数据库
MONGODB_URI=mongodb+srv://...

# 认证
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# 存储 (Cloudflare R2)
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_ENDPOINT=https://xxx.r2.cloudflarestorage.com
R2_BUCKET_NAME=thinkus-artifacts
R2_REGION=auto
```

---

## 更新日志

| 日期 | 版本 | 更新内容 |
|------|------|----------|
| 2026-01-16 | 3.6.3 | 小白用户完整交付闭环: 五大服务确保用户从"收到产品"到"用得起来"到"遇到问题能解决"的完整体验；**统一交付入口服务**新增lib/services/unified-delivery.ts(UnifiedDeliveryService)串联所有交付服务提供一键完成全流程能力，9个交付阶段(init/acceptance_test/pre_checklist/deployment/account_setup/notification/monitoring_setup/survey_setup/completed)，DeliveryFlowConfig含projectId/projectName/productType/clientName/clientEmail/clientPhone/customDomain/enableBackup/enableMonitoring/notifyChannels/sendWelcomeEmail/scheduleSurvey/skipAcceptanceTest/skipChecklist/autoRetryOnFailure/maxRetries，createFlow()创建交付流程，startFlow()启动交付并通过ProgressCallback实时回调进度，pauseFlow()/resumeFlow()暂停恢复，retryFailedStage()重试失败阶段，generateDeliverySummary()生成markdown交付报告，FlowStage含stage/name/description/status/progress/canSkip/canRetry，DeliveryFlowState含outputs(productUrl/adminUrl/adminCredentials/statusPageUrl/surveyId)和stats(completedStages/failedStages/skippedStages/totalTimeMs)，新增components/project/unified-delivery-panel.tsx组件(UnifiedDeliveryPanel/QuickDeliveryButton/DeliveryStatusBadge)支持配置面板/实时进度/阶段列表/交付产物展示/报告下载；**用户端状态页服务**新增lib/services/user-status-page.ts(UserStatusPageService)为用户提供简单易懂的产品状态页，5种组件状态(operational/degraded/partial_outage/major_outage/maintenance)每种含label/labelCn/color/icon/priority，6个默认组件(website/api/database/auth/cdn/storage)，StatusPageData含overallStatus/overallStatusText/components/activeIncidents/scheduledMaintenances/uptimeHistory，createStatusPage()创建状态页，createIncident()/updateIncident()事件管理，scheduleMaintenance()计划维护，recordUptime()记录正常率，generateStatusPageHtml()生成完整HTML状态页(自动60秒刷新)，generateStatusWidget()生成嵌入式状态小部件，新增components/project/user-status-panel.tsx组件(UserStatusPanel/SimpleStatusIndicator/StatusBadgeMini/StatusPageEmbed)支持红绿灯总体状态/90天正常率图表/组件状态/事件列表/维护计划；**主动通知服务**新增lib/services/proactive-notifier.ts(ProactiveNotifierService)主动向用户推送重要信息，10种通知类型(status_change/renewal_reminder/usage_tip/security_alert/maintenance/feature_update/milestone/activity_report/survey_request/support_followup)，4种优先级(low/normal/high/urgent)，5种渠道(in_app/email/sms/wechat/push)，NOTIFICATION_TEMPLATES预定义12个通知模板(status_down/status_recovered/renewal_30days/renewal_7days/security_login_new_device/security_failed_logins/tip_unused_feature/milestone_users/maintenance_scheduled/weekly_report)，sendNotification()/sendFromTemplate()发送通知，NotificationPreferences含enabledTypes/enabledChannels/quietHoursStart/quietHoursEnd/emailFrequency/language，checkRules()触发规则检查，generateNotificationEmail()生成精美HTML邮件，新增components/project/notification-center.tsx组件(NotificationCenter/NotificationBell/NotificationPopover/NotificationToast)支持通知列表/类型过滤/偏好设置/未读计数/铃铛按钮/弹出框/Toast提示；**紧急联系通道服务**新增lib/services/emergency-contact.ts(EmergencyContactService)为用户提供简单直接的紧急求助通道，8种问题类型(site_down/data_loss/security_breach/payment_issue/login_blocked/feature_broken/slow_performance/other)每种含label/icon/defaultUrgency/recommendedChannels，3种紧急程度(normal/urgent/critical)，5种联系渠道(phone/wechat/email/ticket/callback)，SLA_CONFIG配置首次响应时间(critical:5分钟/urgent:15分钟/normal:60分钟)和解决时限，createRequest()创建紧急请求并自动分配客服，autoAssign()智能分配(按技能/负载/优先级)，escalate()升级请求，addResponse()/resolve()处理请求，isWorkingHours()检查工作时间，getEstimatedWaitTime()预计等待时间，generateEmergencyPageHtml()生成紧急联系页面；**数据备份恢复服务**新增lib/services/data-backup.ts(DataBackupService)为用户提供简单的数据保护和恢复能力，3种备份类型(full/incremental/snapshot)，4种备份计划(hourly/daily/weekly/monthly)，5种存储位置(local/s3/gcs/azure/r2)，BackupConfig含enabled/schedule/type/retentionDays/storageLocation/notifyOnFailure，createBackup()创建备份并通过onProgress回调进度，restoreBackup()恢复备份，BackupStats含totalBackups/successfulBackups/failedBackups/totalSizeBytes/avgDurationSeconds/healthStatus/healthMessage，cleanupExpiredBackups()清理过期备份，getStorageUsage()获取存储使用情况，generateBackupSummary()生成备份摘要报告 |
| 2026-01-16 | 3.6.2 | 交付后续保障系统: 四大功能确保交付后用户真正用起来并持续满意；**用户活跃度追踪服务**新增lib/services/user-activity-tracker.ts(UserActivityTrackerService)支持10种用户行为类型(login/page_view/feature_use/data_create/data_update/api_call/admin_action/export/share/payment)，ActivityMetrics含lastActiveAt/daysSinceLastActive/dailyActiveCount/weeklyActiveCount/monthlyActiveCount/featuresUsed/featureUsageRate/avgSessionDuration/activityTrend/weekOverWeekChange，6种活跃度等级(highly_active/active/moderate/low/inactive/churned)，4种健康状态(healthy/at_risk/critical/churned)，UserHealthReport含healthScore/riskFactors/churnProbability/recommendedActions，DEFAULT_CARE_TRIGGERS预定义6种关怀触发条件(交付后首检/7天不活跃/14天预警/流失预警/功能未用/活跃度下降)自动发送关怀邮件/电话回访，generateTrackingScript()生成嵌入式追踪脚本，新增components/project/user-activity-panel.tsx组件(UserActivityPanel/UserHealthBadge/ActivityIndicator)支持健康度可视化/趋势图/风险因素/建议行动；**持续运维自愈服务**新增lib/services/auto-ops.ts(AutoOpsService)支持10种检查类型(health/ssl/domain/database/storage/memory/cpu/response_time/error_rate/backup)，CheckResult含status/message/value/threshold/autoFixable/fixAction，HEALING_STRATEGIES预定义6种自愈策略(restart_service/reconnect_database/clear_cache/memory_cleanup/cleanup_storage/enable_rate_limit)每策略含condition/action/cooldownMinutes/maxAttempts，HealingAction含execute/rollback函数，runInspection()执行完整巡检生成InspectionReport，attemptAutoFix()自动执行修复，OpsDashboard含uptime(24h/7d/30d)/openIssues/recentAlerts/autoFixStats，新增components/project/auto-ops-panel.tsx组件(AutoOpsPanel/OpsStatusBadge/OpsMiniIndicator)支持可用率展示/巡检详情/问题列表/告警记录/自动修复统计；**内部交付看板服务**新增lib/services/delivery-dashboard.ts(DeliveryDashboardService)支持9种交付阶段(pending/developing/testing/deploying/configuring/onboarding/delivered/monitoring/completed)，DeliveryProject含phase/priority/progress/slaHours/slaStatus/slaRemainingHours/assignedTo/blockers/notes/tags，4种优先级(urgent/high/normal/low)每级含slaMultiplier，SLAStatus含on_track/at_risk/breached，getKanbanView()返回看板列视图支持筛选，DashboardStats含totalDeliveries/activeDeliveries/slaComplianceRate/byPhase/byPriority/teamPerformance，TimelineEvent追踪phase_change/task_completed/blocker_added等事件；**满意度收集服务**新增lib/services/satisfaction-collector.ts(SatisfactionCollectorService)支持3种评分类型(nps/csat/ces)和7种满意度维度(overall/quality/delivery_speed/communication/support/value/ease_of_use)，SatisfactionSurvey含type/dimensions/triggerEvent/status/responses，SurveyResponse含npsScore/npsCategory/dimensionScores/whatWentWell/whatCouldImprove，calculateNPSScore()计算净推荐值，SatisfactionStats含npsScore/npsDistribution/dimensionAverages/trend/topPositives/topNegatives，ImprovementSuggestion从低分反馈自动提取，generateSurveyEmailHtml()生成精美调查邮件，新增components/project/satisfaction-panel.tsx组件(SatisfactionPanel/NPSBadge/SatisfactionStars/SatisfactionIndicator)支持NPS仪表盘/维度评分/用户反馈/改进建议展示 |
| 2026-01-16 | 3.6.1 | 全自动化交付系统P0: 四大核心功能确保零技术背景用户顺利收到完美产品；**自动化验收测试服务**新增lib/services/acceptance-tester.ts(AcceptanceTesterService)支持14种测试场景类型(homepage_load/user_registration/user_login/password_reset/core_feature/admin_access/data_crud/payment_flow/file_upload/search_function/responsive_ui/api_health/error_handling/performance)，PRODUCT_TYPE_SCENARIOS配置12种产品类型对应的必测场景，generateTestScenarios()根据产品类型自动生成测试用例，runAcceptanceTest()执行完整验收测试含进度回调，runSmokeTest()快速冒烟测试，TestStep含action/expectedResult/actualResult/screenshot，AcceptanceTestReport输出passedScenarios/failedScenarios/blockers/warnings/acceptanceScore/canDeliver，新增components/project/acceptance-test-panel.tsx组件(AcceptanceTestPanel/AcceptanceTestBadge)支持场景展开/步骤详情/阻塞问题/重新测试；**交付前自检清单服务**新增lib/services/delivery-checklist.ts(DeliveryChecklistService)定义35+检查项分10大类(deployment/functionality/security/data/documentation/credentials/monitoring/backup/support/legal)，检查重要性4级(blocker/critical/important/optional)，检查状态6种(pending/checking/passed/failed/warning/manual_required)，runAutomaticChecks()执行自动检查(部署状态/SSL证书/API健康/数据库连接/备份配置等)，confirmItem()手动确认，calculateReadiness()就绪度评分(blocker30/critical20/important10/optional5权重)，generateReport()生成markdown报告，overallStatus输出ready/ready_with_warnings/not_ready，新增components/project/delivery-checklist-panel.tsx组件(DeliveryChecklistPanel/DeliveryReadinessBadge/ChecklistItemRow)支持分类折叠/就绪度进度条/阻塞高亮/手动确认；**一键交付编排服务**新增lib/services/one-click-delivery.ts(OneClickDeliveryService)定义8个交付阶段(preparation/build/test/deploy/verify/configure/initialize/handover)共24步骤，DeliveryConfig配置skipTests/skipBackup/notifyChannels/customDomain，executeDelivery()执行完整交付含实时进度，retryFailedStep()重试(最多3次)，rollbackStep()回滚，DeliveryOutput含productUrl/adminUrl/adminCredentials/databaseInfo/domainInfo/backupInfo/monitoringUrl，新增components/project/delivery-console.tsx组件(DeliveryConsole/DeliveryStatusBadge)支持配置面板/阶段指示器/实时日志/凭证展示/重试失败；**用户账号初始化服务**新增lib/services/user-onboarding.ts(UserOnboardingService)支持4种账号类型(admin/manager/operator/viewer)和3种通知渠道(email/sms/secure_link)，generateSecurePassword()16位强密码，generateFriendlyPassword()易记密码(HappyTiger123格式)，validatePasswordStrength()密码强度评分，createAccount()创建账号含临时密码和首次登录强制改密，sendWelcomeNotification()发送欢迎通知(精美HTML邮件)，resetPassword()重置密码并通知，generateCredentialCard()生成ASCII凭证卡片(可打印)，新增components/project/account-handover-panel.tsx组件(AccountHandoverPanel/AccountHandoverBadge/QuickAdminSetup)支持账号类型选择/多渠道通知/凭证预览/密码显示隐藏/批量创建/安全提醒 |
| 2026-01-16 | 3.6.0 | 小白用户交付体验优化(P2): 三大高级功能让运维更轻松；**构建失败自动修复服务**新增lib/services/build-auto-fixer.ts(BuildAutoFixerService)，支持13种构建错误类型(dependency_missing/dependency_conflict/type_error/syntax_error/import_error/env_missing/memory_exceeded/timeout/node_version/build_script_error/asset_not_found/config_invalid/unknown)，ERROR_PATTERNS定义12组正则匹配规则自动识别错误类型，FIX_STRATEGIES预定义9种修复策略(install_missing_dep/clear_cache_reinstall/increase_memory/fix_esm_cjs/add_env_placeholder/use_legacy_peer_deps/update_node_version/skip_type_check/extend_timeout)每种策略含priority优先级/autoApplicable自动应用标记/riskLevel风险等级/apply执行函数，parseBuildLog()解析构建日志提取错误，runAutoFixLoop()最多5轮自动尝试修复，generateHumanReadableSummary()生成人话修复报告，新增components/project/build-fix-panel.tsx组件(BuildFixPanel/BuildStatusBadge/BuildErrorBanner)支持错误列表/修复尝试记录/一键修复/人工支持请求；**可视化配置编辑器服务**新增lib/services/visual-config-editor.ts(VisualConfigEditorService)，支持10种配置分类(site_info/appearance/features/integrations/seo/analytics/email/payment/social/advanced)，CONFIG_TEMPLATES预定义8大类配置模板含50+配置字段，每字段含key/label/description/type/defaultValue/required/placeholder/options/validation/dependsOn，支持12种字段类型(text/textarea/number/boolean/select/multiselect/color/image/url/email/password/json)，validateConfig()验证配置值，generateEnvFile()生成环境变量文件，generatePreviewHtml()生成预览HTML，parseEnvFile()解析现有配置，新增components/project/visual-config-editor.tsx组件(VisualConfigEditor/ConfigPreviewModal/ConfigQuickAccess)支持分类导航/表单编辑/实时验证/预览效果/保存重置；**续费提醒服务**新增lib/services/renewal-reminder.ts(RenewalReminderService)，支持10种服务类型(domain/hosting/ssl/database/storage/email/cdn/monitoring/support/subscription)，SERVICE_CONFIG配置每种类型的label/icon/defaultReminders/criticalDays，registerService()注册服务并自动安排提醒，scheduleReminders()根据到期时间安排多次提醒(30/14/7/3/1天)，getRenewalSummary()获取项目续费摘要(expiringServices/expiredServices/upcomingRenewals/totalRenewalCost)，sendReminder()发送提醒邮件(精美HTML模板)，renewService()续费并重新安排提醒，enableAutoRenewal()/disableAutoRenewal()自动续费开关，generateSummaryText()生成人话续费摘要，新增components/project/renewal-reminder-panel.tsx组件(RenewalReminderPanel/RenewalBadge/AutoRenewalToggle/RenewalFloatingButton)支持过期/即将到期分组展示/一键续费/自动续费开关/悬浮提醒按钮 |
| 2026-01-16 | 3.5.9 | 小白用户交付体验优化(P1): 三大辅助功能进一步提升交付体验；**交互式教程生成服务**新增lib/services/tutorial-generator.ts(TutorialGeneratorService)支持5种教程类型(quick_start/admin_guide/feature_tour/troubleshoot/customization)，预定义模板包含标题/描述/预计时间/步骤列表，每步骤含order/title/description/action/expectedResult/tips/faq/targetElement/imageUrl/gifUrl，generateTutorials()根据项目类型自动生成适合的教程，generateTutorialHTML/Markdown()导出教程文档，新增components/project/tutorial-guide.tsx组件(TutorialGuide/TutorialCardList/QuickStartButton/TutorialComplete)支持进度追踪/步骤切换/FAQ展开/完成庆祝动画；**一键报障智能诊断服务**新增lib/services/issue-reporter.ts(IssueReporterService)支持8种问题类型(cannot_access/login_failed/feature_broken/slow_performance/data_lost/display_error/payment_issue/other)，ISSUE_TYPE_CONFIG配置每种类型的label/icon/description/quickFixes/diagnosisRules，DiagnosisResult含possibleCauses概率/canAutoFix/autoFixSuggestions/manualFixSteps/estimatedFixTime/needsHumanSupport，createReport()自动收集系统信息并运行诊断规则，executeAutoFix()执行自动修复(clear_cache/refresh_page/retry_login等)，generateReportSummary()生成客服沟通摘要，新增components/project/issue-report-dialog.tsx组件(IssueReportDialog/IssueReportButton)4步流程(select_type→describe→diagnosing→result)支持快速修复提示/诊断动画/自动修复执行/客服联系；**交付信息存档与重发服务**新增lib/services/delivery-archive.ts(DeliveryArchiveService)，DeliveryInfo接口含projectId/userId/productUrl/adminUrl/adminCredentials/databaseInfo/domainInfo/tutorials/qrCode/quickStartGuide/supportInfo/emailHistory，createArchive()创建交付存档并生成QR码，generateDeliveryEmail()生成精美HTML邮件(产品链接/管理员信息/数据库信息/域名信息/快速入门/支持信息)，sendDeliveryEmail()通过SendGrid发送，resendDeliveryInfo()重发完整交付信息，resendCredentials()单独重发登录凭证(部分脱敏)，getEmailHistory()查询邮件发送记录，支持邮件历史追溯和多次重发 |
| 2026-01-16 | 3.5.8 | 小白用户交付体验优化(P0): 三大核心功能让零技术背景用户也能轻松使用；**错误人话翻译系统**新增lib/errors/friendly-errors.ts定义50+常见错误的人话翻译(FRIENDLY_ERRORS数组)，按9大类别(network/database/deployment/auth/payment/api/build/resource/config)组织，每个错误包含code/pattern/title/description/suggestion/canRetry/retryDelay/maxRetries/severity/icon字段，新增lib/services/error-translator.ts服务(translateError/shouldAutoRetry/isFatalError方法)支持错误历史记录和统计，新增components/ui/friendly-error.tsx组件(FriendlyError/FriendlyErrorInline/FriendlyErrorBoundary)支持大图标+人话描述+重试倒计时+联系客服入口；**红绿灯状态面板**新增lib/config/simple-status.ts定义SimpleStatus类型(healthy/attention/error)和STATUS_ICONS/STATUS_LABELS/STATUS_COLORS/STATUS_DESCRIPTIONS配置，SERVICE_CHECKS定义6项服务检查(deployment/database/domain/api/response_time/error_rate)含权重和关键性标记，新增lib/services/status-aggregator.ts服务(aggregateStatus方法)聚合部署/数据库/域名/API状态为红绿灯，输出AggregatedStatus含overall/score/checks/issues/uptimeDays，新增components/project/simple-status-panel.tsx组件(SimpleStatusPanel/SimpleStatusIndicator/SimpleStatusBadge)支持自动刷新/一键修复/问题列表/服务详情展开；**托管子域名方案**新增lib/services/subdomain-manager.ts服务(SubdomainManagerService)，generateSubdomain方法自动生成xxx.thinkus.app子域名(sanitize中文/保留域名检测/长度限制3-32)，checkAvailability检查Vercel域名可用性，provisionSubdomain调用Vercel API添加域名并等待SSL证书(waitForSSL最多12次轮询)，支持Cloudflare DNS自动配置(configureCloudflareDNS)，RESERVED_SUBDOMAINS保留40+系统子域名；新增环境变量(THINKUS_DOMAIN) |
| 2026-01-16 | 3.5.7 | 产品类型定制化交付系统: 针对10种不同产品类型的专属交付流程；产品类型自动检测(detectProductType)从productType/techStack/features三层推断，支持web-app/mobile-app/desktop-app/mini-program/api-service/blockchain/ai-app/ecommerce/iot-app/game；移动应用自动发布(deliverMobileApp)iOS构建(Expo/React Native/Xcode)上传App Store Connect API提交TestFlight、Android构建AAB签名上传Google Play Console API发布到内部测试轨道、generateAppStoreConnectJWT生成ES256签名、uploadToGooglePlay调用androidpublisher v3 API；小程序自动提审(deliverMiniProgram)微信小程序使用miniprogram-ci上传代码调用submit_audit提审、支付宝小程序调用alipay.open.mini.version.upload和audit.apply API、自动获取access_token；桌面应用分发(deliverDesktopApp)Electron使用electron-builder多平台构建(win/mac/linux)生成NSIS/DMG/AppImage、Tauri多目标构建、generateElectronBuilderConfig自动生成配置、setupElectronAutoUpdate配置自动更新服务(latest.yml)、setupTauriAutoUpdate生成tauri-update.json、notarizeMacApp调用notarytool进行macOS公证和staple；区块链合约部署(deliverBlockchainApp)支持5条链(Ethereum/Polygon/BSC/Arbitrum/Solana)、getChainConfig配置测试网/主网RPC和区块浏览器、deployContracts使用Hardhat/Foundry/Anchor部署、verifyContract在Etherscan验证合约、estimateGas估算Gas费用；API服务交付(deliverApiService)部署API生成OpenAPI文档、generateSdk使用openapi-generator-cli生成TypeScript/Python/Go三种SDK；电商平台交付(deliverEcommerce)部署商城配置Stripe/Alipay/WeChat支付、初始化商品数据；AI应用交付(deliverAiApp)上传模型到HuggingFace/Replicate、配置推理API；统一交付编排器(deliverByProductType)根据产品类型自动选择交付流程、输出primaryUrl/secondaryUrls/credentials/documentation、推送product_type_delivered事件；PRODUCT_DELIVERY_CONFIG配置每种类型的platforms/requiredCredentials/deliverySteps/estimatedTime；新增环境变量(APPLE_API_KEY_ID/APPLE_API_ISSUER_ID/APPLE_API_PRIVATE_KEY/GOOGLE_PLAY_SERVICE_ACCOUNT_KEY/WECHAT_PRIVATE_KEY/WECHAT_APP_SECRET/ALIPAY_PRIVATE_KEY/APPLE_DEVELOPER_ID/APPLE_TEAM_ID/DEPLOYER_PRIVATE_KEY/ETHERSCAN_API_KEY/HF_TOKEN/REPLICATE_API_KEY) |
| 2026-01-16 | 3.5.6 | 小白用户完整交付闭环: 面向零技术背景用户的一站式交付解决方案；自定义域名管理(configureCustomDomain)调用Vercel API绑定域名、支持SSL自动签发(auto/manual/managed)、DNS验证和重定向配置、Cloudflare DNS集成、推送custom_domain_configured事件；自动数据库备份(configureAutoBackup)调用MongoDB Atlas API配置备份策略、支持定时备份(daily/hourly/weekly)、保留策略(7天/30天/365天)、推送backup_configured事件；Sentry错误监控集成(integrateSentry)通过API创建Sentry项目和DSN、自动生成sentry.client.config.ts和sentry.server.config.ts(Next.js/Vite/Remix支持)、注入到项目文件、推送sentry_integrated事件；新用户引导向导(generateOnboardingGuide)7步默认引导(欢迎→核心功能→主要页面→设置→帮助→快捷键→完成)、自动生成React组件(OnboardingGuide.tsx)支持进度保存和跳过、推送onboarding_generated事件；服务状态看板(getServiceStatus)聚合检查API/数据库/Redis/外部服务状态、支持响应时间监控、配额使用率检测、生成状态看板URL；一键客服挂件(generateSupportWidget)支持Crisp/Intercom/Custom三种平台、自动生成嵌入脚本和React组件(CrispChat/IntercomChat)、配置客服工作时间和自动回复；完整交付闭环(runCompleteDeliveryLoop)9阶段流水线(部署→自定义域名→备份配置→Sentry集成→引导向导→状态看板→客服挂件→续费提醒→交付包生成)、completenessScore完整度评分(7项加权：部署30%+域名15%+备份10%+监控15%+引导10%+状态10%+客服10%)、readyForHandover交付判定(完整度≥80%为ready)、精美交付包(productUrl/adminUrl/凭证/QR码/快速入门/状态看板URL/客服邮箱)、推送complete_delivery_loop事件；新增环境变量(CLOUDFLARE_API_TOKEN/CLOUDFLARE_ZONE_ID/SENTRY_AUTH_TOKEN/SENTRY_ORG) |
| 2026-01-16 | 3.5.5 | 真实云平台集成: Vercel API真实部署(deployToVercel)调用Vercel REST API上传文件并部署、支持Next.js/Vite/Nuxt/Remix框架、轮询部署状态(QUEUED→BUILDING→READY)最长5分钟、自动配置环境变量和regions、collectProjectFiles递归收集项目文件(排除node_modules/.git/.next)；MongoDB Atlas API真实配置(provisionMongoDBAtlas)调用Atlas Admin API创建M0免费集群(支持AWS/GCP/AZURE)、等待集群IDLE状态、自动创建数据库用户(readWriteAnyDatabase权限)、配置IP白名单(0.0.0.0/0)、生成SRV连接字符串；真实QR码生成(generateRealQRCode)优先使用qrcode库生成PNG Data URL、备选Google Charts API、最后使用SVG伪随机模拟(simpleHash确定性)；SendGrid邮件发送(sendEmailViaSendGrid)调用SendGrid v3 API、支持动态模板和HTML内容、精美交付邮件模板(DELIVERY_EMAIL_TEMPLATE)包含产品链接/QR码/管理员凭证/快速入门/安全提醒；持续健康监控(startContinuousMonitoring)检查多端点(/api/health//api/status)、计算可用率和平均响应时间、触发告警(downtime/slow_response)、推送monitoring_status事件；部署回滚(rollbackDeployment)通过Vercel API promote回滚到之前版本、支持自动回滚(autoRollback)、推送deployment_rollback事件；完整真实部署流程(runRealDeployment)8步流水线(MongoDB Atlas→Vercel部署→管理员创建→数据初始化→健康监控→QR码→邮件通知→回滚配置)、支持skipDatabase/skipEmail/skipMonitoring选项、失败自动回滚、推送real_deployment_complete事件；新增环境变量(VERCEL_TOKEN/MONGODB_ATLAS_PUBLIC_KEY/MONGODB_ATLAS_PRIVATE_KEY/MONGODB_ATLAS_PROJECT_ID/SENDGRID_API_KEY) |
| 2026-01-15 | 3.5.4 | 小白用户全自动化交付系统: 面向零技术背景用户的一键交付解决方案；自动数据库配置(provisionDatabase)支持5种数据库提供商(MongoDB Atlas/PlanetScale/Supabase/Neon/Local)，自动生成安全数据库名称和密码(generateSecurePassword 24位混合字符)，按提供商生成连接字符串；自动云部署(deployToProduction)支持5种云平台(Vercel/Railway/Fly.io/Render/Docker)，自动生成子域名、配置环境变量(DATABASE_URL/MONGODB_URI)、执行构建和部署、配置SSL；自动管理员账号(createAdminAccount)生成安全初始密码(12位)、首次登录强制改密；自动数据初始化(seedInitialData)按数据库类型生成种子脚本(MongoDB用MongoClient/SQL用Prisma)、创建管理员用户和默认配置；生产环境验证(verifyProductionDeployment)包含健康检查(API /health端点)、首页加载测试、核心流程匹配(CORE_USER_FLOWS 5种流程：首页/注册/登录/管理员/API健康)、成功率计算；用户交付包生成(generateDeliveryPackage)包含产品URL、QR码(Base64 SVG)、管理员登录信息、快速入门指南(4节：访问应用/管理员登录/开始使用/获取帮助)、支持信息；自动重试机制(executeWithRetry)支持指数退避(DEFAULT_RETRY_CONFIG: 3次重试/5秒基础延迟/9种可重试错误)；全自动交付主流程(runFullAutoDelivery)8阶段流水线(代码检查→测试→数据库→部署→初始化→验证→交付包→通知)、时间线追踪、综合评分(6项加权：代码20%+测试20%+数据库15%+部署25%+验证15%+交付5%)、三种交付状态(delivered/partial/failed)、delivery_complete事件推送 |
| 2026-01-15 | 3.5.3 | 生产级交付验证系统: 生产就绪检查(runProductionReadinessCheck)包含监控配置检测(Prometheus/Datadog/Grafana Cloud/NewRelic/CloudWatch)自动生成prometheus.yml和/api/metrics端点、日志配置检测(ELK/Loki/Splunk)自动生成结构化日志logger.ts(支持correlationId)、告警规则检测(alertmanager.yml/Slack/PagerDuty/Email通道)、错误追踪检测(Sentry/Bugsnag/Rollbar)自动生成sentry.client.config.ts；文档完整性检查(runDocumentationCompletenessCheck)包含API文档检测(OpenAPI/Swagger/GraphQL/AsyncAPI)自动生成openapi.yaml、README评分(10项检查:标题/描述/安装/使用/配置/API/贡献/许可证/联系/更新)、部署文档自动生成DEPLOYMENT.md(前置条件/环境配置/部署步骤/验证/故障排查/回滚)、运维手册自动生成OPERATIONS.md(监控/日志/备份/扩缩容/告警处理)、CHANGELOG自动生成(Keep a Changelog格式)；安全合规检查(runSecurityComplianceCheck)包含漏洞扫描(npm audit/pip-audit解析)统计critical/high/moderate/low、许可证扫描(license-checker)16种许可证兼容性规则(MIT/Apache/BSD兼容,GPL/AGPL不兼容)、敏感数据扫描(15种SECRET_PATTERNS:AWS/GitHub/Stripe/Slack/JWT/Google/Anthropic/OpenAI密钥)、GDPR合规检查(数据收集/隐私政策/Cookie同意/数据保留/用户权限)；运维就绪检查(runOperationsReadinessCheck)包含迁移状态检测(Prisma/TypeORM/Sequelize/Mongoose/Alembic/Goose)、备份配置检测自动生成backup.sh脚本(MongoDB/PostgreSQL备份+S3上传)、扩缩容配置检测自动生成k8s/hpa.yaml(CPU/Memory指标,2-10副本)和k8s/deployment.yaml(资源请求/限制/健康检查)、灾难恢复检测自动生成DISASTER-RECOVERY.md(RTO/RPO/故障场景/恢复程序/测试计划)、Runbooks检测(deployment/rollback/scaling/incident-response等7项)；生产级交付验证(runProductionGradeDeliveryVerification)整合基础交付(30%)+生产就绪(20%)+文档(15%)+安全(20%)+运维(15%)，输出生产决策(ready/conditional/not-ready)、blockers/warnings/recommendations列表、预估修复时间 |
| 2026-01-15 | 3.5.2 | 完整交付验证系统: 部署验证(runDeploymentVerification)包含环境配置验证(检测process.env引用/import.meta.env/敏感变量占位符)、staging部署(Docker/本地构建自动检测)、部署后测试(healthCheck重试5次/冒烟测试/API测试/UI测试)、回滚机制验证(Git reset/Docker重启)；CI/CD验证(runCICDVerification)包含CI配置生成(GitHub Actions/GitLab CI模板)、流水线语法验证(jobs/stages/steps检查)、回归测试配置(Jest/Vitest/Pytest检测，自动生成jest.config.js)；用户验收(runUserAcceptanceVerification)包含功能演示生成(WALKTHROUGH.md文档)、验收清单创建(ACCEPTANCE_CHECKLIST.md，按功能/UI/性能/安全分类)、预览环境设置(测试账号/访问地址/有效期)；完整交付验证(runCompleteDeliveryVerification)整合产品验证(30%)+部署验证(25%)+CI/CD(20%)+用户验收(25%)，输出交付决策(approve/conditional/reject)和交付物清单(源码/文档/CI配置/预览环境) |
| 2026-01-15 | 3.5.1 | 业务逻辑验证系统: 新增5大类业务断言类型(auth/crud/shopping/payment/permission)共23种断言规则；认证断言(登录成功返回token/密码错误返回401/登出失效token/重复注册拒绝/密码规则验证)；CRUD断言(创建返回ID/创建后可查询/更新数据变化/删除后查不到/分页正确)；购物断言(加入购物车数量+1/移出数量-1/总价计算正确/库存减少/订单金额正确)；支付断言(支付成功创建订单/支付失败回滚/退款恢复余额)；权限断言(未授权拒绝/角色权限/资源所有权)；核心方法:runBusinessLogicVerification()业务逻辑验证、generateBusinessAssertions()生成业务断言测试代码、executeBusinessAssertions()执行断言、verifyDataStateChanges()数据状态前后对比验证、validateBusinessFlows()业务流程验证(电商流程/认证流程/内容管理流程)；runFinalProductVerification()最终产品验证整合静态分析(30%)+运行时验证(40%)+业务逻辑(30%)三层验证，输出综合评分和质量等级(A/B/C/D/F) |
| 2026-01-15 | 3.5.0 | 运行时验证系统: 真正启动应用验证代码可运行；运行时验证(runRuntimeVerification)包含依赖安装/应用启动/健康检查/页面访问/API端点验证，支持多端口检测(3000/8000/8080/5000/4000)、多语言启动命令检测(npm/python/go)、启动日志错误捕获；E2E用户旅程测试(runUserJourneyTests)预定义6种用户旅程(注册/登录/浏览商品/添加购物车/结账/搜索)，根据proposal自动匹配适用旅程，生成Playwright测试脚本并执行；冒烟测试(runSmokeTests)包含关键测试(首页/静态资源/API健康)+认证测试(登录页/注册页/登录API)+数据连接测试(数据库/缓存)，输出健康状态(healthy/degraded/unhealthy)；数据完整性验证(verifyDataIntegrity)检测数据库配置(MongoDB/PostgreSQL/MySQL)、Schema模型定义(Prisma/Mongoose/TypeORM)、种子数据、数据库迁移状态；综合运行时验证(runComprehensiveRuntimeVerification)整合所有验证，输出blockers/warnings列表和readyForProduction判定 |
| 2026-01-15 | 3.4.9 | 完整交付验证系统: 功能验收器(ACCEPTANCE_CHECKS预定义15种常见功能检查规则，自动从proposal提取关键词匹配代码/UI/API/测试，置信度评分0-100，P0/P1/P2不同阈值)；测试覆盖率检测(Istanbul/nyc/coverage.py/go test多语言支持，行/分支/函数覆盖率分析，自动生成覆盖率收集脚本)；交付物生成器(7种交付物类型：Docker镜像/源码压缩包/API文档/用户手册/部署指南/变更日志/许可证)；质量评分系统(7个维度加权评分：功能验收30%+覆盖率15%+代码质量15%+安全15%+性能10%+可访问性5%+文档10%，A/B/C/D/F五级评定)；最终交付决策引擎(approve/conditional/reject三种决策，8项检查清单，自动生成修复建议和预估时间)；核心方法:runFeatureAcceptance()功能验收、runCoverageAnalysis()覆盖率分析、generateDeliverables()交付物生成、calculateQualityScore()质量评分、makeFinalDeliveryDecision()最终决策 |
| 2026-01-15 | 3.4.8 | 全面测试体系: 新增14种测试类型支持(unit/integration/e2e/visual/performance/load/compatibility/accessibility/security/api-contract/chaos/i18n/realtime/mobile)；视觉回归测试(Playwright截图+pixelmatch像素对比，差异阈值可配置)；性能测试(Lighthouse集成，FCP/LCP/CLS/TTI/TTFB指标检测)；负载测试(k6脚本生成，50VUs压测/P95/P99延迟阈值)；兼容性测试(Chrome/Firefox/Safari/Edge多浏览器+iPhone/Android多设备)；无障碍测试(axe-core集成，WCAG 2.0/2.1 AA标准检测)；安全测试(响应头检查/敏感数据检测/依赖漏洞扫描/XSS防护验证)；混沌工程(网络延迟/丢包/CPU压力/内存压力实验，弹性评分)；国际化测试(locale文件完整性/日期时间格式/数字货币格式验证)；核心方法:runComprehensiveTests()编排所有测试类型，支持测试类型选择和并行执行 |
| 2026-01-15 | 3.4.7 | 生产环境自愈系统: ThinkusLogger智能日志SDK(自动收集/缓冲/发送日志到开发平台)、LOG_INJECTION_POINTS自动日志注入点(API入口/数据库操作/错误处理/外部服务/认证/支付/区块链)、AUTO_DIAGNOSIS_PATTERNS自动诊断模式(17种错误类型识别)、FIX_STRATEGIES修复策略模板(15种常见问题的代码修复模板)；核心方法:generateSmartLoggerSDK()生成日志SDK、diagnoseLogs()诊断日志错误、autoFixAndRedeploy()自动修复并部署、injectLogsIntoCode()注入日志、startProductionHealingLoop()启动自愈循环；支持场景:数据库连接/空值访问/API超时/认证失败/区块链Gas不足/支付失败/内存溢出等自动检测和修复 |
| 2026-01-15 | 3.4.6 | 全自动化测试环境: 针对21种不可测试场景的完全自动化解决方案，无需用户配置；AUTO_TEST_ACTIONS配置(auto-mock/auto-sandbox/auto-fork/auto-testnet/auto-stub/auto-emulator)、每种场景包含setupCommands+adapterTemplate+testTemplate；自动启动Mock服务容器(Anvil/LocalStack/MailHog/WireMock等)、自动生成环境适配器代码(Mock/真实环境无缝切换)、自动生成并执行测试用例；支持场景:区块链Fork主网/跨链/支付网关/OAuth/AWS云服务/短信邮件/IoT设备/GPU推理/银行API/医疗API/消息队列/遗留系统等 |
| 2026-01-15 | 3.4.5 | 测试环境与Mock服务支持: 新增21种不可测试原因检测(mainnet-only/production-api/payment-gateway/cloud-service/hardware-device/bank-api等)、10种测试策略(unit-test/integration-mock/testnet/fork-mainnet/sandbox/staging-only等)、14种Mock服务模板(Anvil/Hardhat/LocalStack/Stripe Test/Firebase Emulator/MinIO/WireMock等)、11种区块链测试网配置(Sepolia/Mumbai/Solana Devnet/NEAR Testnet等)；自动分析功能可测试性、智能选择测试策略、生成Docker Compose测试环境配置 |
| 2026-01-15 | 3.4.4 | 安全审计与漏洞检测: 新增8种安全审计工具配置(Slither/Mythril/Echidna/Foundry Fuzz/Soteria/cargo-audit/Move Prover/Web Security)、23种漏洞类别检测(重入攻击/整数溢出/访问控制/闪电贷/XSS/SQL注入等)、SecurityAuditResult接口(漏洞严重程度/CWE/SWC标识/自动修复建议)；区块链项目自动添加安全审计服务、按合约平台智能选择审计工具(Solidity→Slither+Mythril、Solana→Soteria、Move→Prover) |
| 2026-01-15 | 3.4.3 | 区块链/Web3项目支持: 新增23种区块链平台(Ethereum/Polygon/Arbitrum/Solana/NEAR/Aptos/Sui/StarkNet/Polkadot/TON等)、12种智能合约语言(Solidity/Vyper/Rust-Anchor/Move/Cairo/FunC等)、11种开发工具配置(Hardhat/Foundry/Anchor/The Graph)；自动检测区块链技术栈、智能生成服务架构(智能合约+索引器+Web3前端+后端API)、按平台选择最佳工具链(EVM→Foundry/Hardhat、Solana→Anchor) |
| 2026-01-15 | 3.4.2 | 扩展前端框架支持: 新增22种前端框架 - Web(Next.js/Nuxt/Vue/Angular/SvelteKit/SolidStart/Remix/Astro/Qwik)、移动端(React Native/Flutter/SwiftUI/Jetpack Compose)、桌面(Electron/Tauri)、WebAssembly(Leptos/Yew/Blazor)、其他语言(Elm/ReScript/ClojureScript)；自动检测前端框架、按产品类型智能选择(移动应用→Flutter/React Native、桌面应用→Tauri/Electron)、多平台项目自动创建多个前端服务(Web+Mobile+Desktop) |
| 2026-01-15 | 3.4.1 | 扩展后端语言支持: 新增Kotlin/Ktor、Rust/Actix+Axum、C#/.NET、Ruby/Rails、PHP/Laravel、Scala/Play、Elixir/Phoenix、Swift/Vapor、Dart/DartFrog，共支持14种后端语言，智能语言分配(AI→Python/Rust、实时→Go/Rust/Elixir、数据→Python/Scala) |
| 2026-01-15 | 3.4.0 | 多服务架构支持: 自动检测多语言后端(Node.js/Python/Go/Java)、按服务类型分配功能(API Gateway/AI Service/Realtime Service/Data Service)、服务拓扑排序解决依赖、每服务独立沙盒、跨语言共享类型生成(TypeScript/Python/Go)、服务间通信代码自动生成 |
| 2026-01-15 | 3.3.0 | 分层开发架构: 支持前后端依赖处理(shared→backend→frontend开发顺序)、自动功能层级检测(backend/frontend/fullstack/shared)、后端先行+API类型生成+前后端联合测试+E2E测试，全栈项目自动拆分功能为backend和frontend任务 |
| 2026-01-15 | 3.2.0 | 开发编排器 v2 重构: 按功能点迭代开发 + 质量门禁系统(代码检查/静态分析/单元测试/UI测试) + 智能降级策略(4轮尝试：正常→换方式→简化→最小可用) + 交付报告系统(完美/可用/部分/失败四档评级，用户可选接受/人工修复/退款) |
| 2026-01-15 | 3.1.0 | Claude Vision UI 测试集成: 自动化 UI 测试使用 Playwright 截图 + Claude Vision 分析，评估需求匹配度/美观度/可用性，自动修复循环最多3轮，新增 ui_test_result 事件类型 |
| 2026-01-15 | 3.0.0 | Claude Code 容器化架构: 开发编排器从直接调用 Claude API 改为在 Docker 容器中运行 Claude Code CLI 自主生成代码，新增 claude-code 镜像、gRPC 沙盒集成、终端输出实时推送 |
| 2026-01-15 | 2.3.5 | 添加跳过支付测试流程: 新增/api/projects/create-test API创建测试项目，确认页跳过支付按钮直接创建项目并跳转到进度页 |
| 2026-01-15 | 2.3.4 | 添加推迟功能说明: 合成器输出deferredFeatures字段说明哪些功能被推迟及原因，讨论页和确认页显示推迟功能列表 |
| 2026-01-15 | 2.3.3 | 修复专家对话内容不全: 改进SSE流处理(统一Map键格式、流结束时刷新decoder并处理残余buffer)、添加JSON解析错误日志 |
| 2026-01-15 | 2.3.2 | 修复专家回复被截断: 字数限制从100字增加到150-250字，max_tokens从768增加到1024 |
| 2026-01-15 | 2.3.1 | 修复讨论轮数超过目标问题: 添加reachedTargetRounds标志确保完全退出阶段循环 |
| 2026-01-15 | 2.3.0 | 专家讨论优化: 轮数控制(50轮硬限制)、Token优化(orchestrator每3轮调用)、实时功能共识识别和前端展示 |
| 2026-01-15 | 2.2.1 | 修复专家讨论内容截断: 增加max_tokens从256/512到768/1024 |
| 2026-01-15 | 2.2.0 | 修复流式API错误: chat和discuss API的Controller closed错误、会话数据隔离、E2E测试改进 |
| 2026-01-13 | 2.1.0 | v12升级Phase 4: 运营闭环 - AnalyticsService数据分析、GrowthAdvisor增长建议 |
| 2026-01-13 | 2.0.0 | v12升级Phase 3: 沙盒和直播 - SandboxManager容器管理、RealtimeStream实时推送 |
| 2026-01-13 | 1.9.0 | v12升级Phase 2: 文档处理 - DocumentProcessor多格式处理、RequirementIntegrator需求整合 |
| 2026-01-13 | 1.8.0 | v12升级Phase 1: 基础能力 - ModelRouter分层调度、ExperienceLibrary经验库、InvitationService极致邀请 |
| 2026-01-13 | 1.7.0 | v12升级Phase 0: AI员工止血 - Artifact卸载、Session Summary、Memory Controller、智能记忆增强 |
| 2026-01-11 | 1.6.0 | 完成Phase 3完善: 多产品类型、资产管理、数据分析、模板市场 |
| 2026-01-11 | 1.5.0 | 完成Phase 2完善: 项目管理、设置页面、定价页、首页优化 |
| 2026-01-11 | 1.4.0 | 完成Phase 4: Stripe支付、开发进度页、项目完成页 |
| 2026-01-11 | 1.3.0 | 完成Phase 3: 专家讨论系统、多阶段讨论、方案确认页面 |
| 2026-01-11 | 1.2.0 | 完成Phase 2: 登录注册、仪表盘、对话系统、功能识别 |
| 2026-01-11 | 1.1.0 | 完成Phase 1: 数据库、认证、tRPC、Claude API |
| 2026-01-10 | 1.0.0 | 初始化项目，创建CLAUDE.md |

---

**每次修改后请更新此文档并提交到GitHub主分支**
