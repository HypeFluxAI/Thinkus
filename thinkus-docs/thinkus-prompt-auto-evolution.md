# Thinkus 提示词自动进化系统 v2

> 多Agent自动审核，无需人工干预，只输出评估指标

---

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────────┐
│                   提示词自动进化系统                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐   │
│  │   数据收集    │───▶│   效果评估    │───▶│   优化引擎   │   │
│  └──────────────┘    └──────────────┘    └──────────────┘   │
│                                                │             │
│                                                ▼             │
│                                    ┌───────────────────────┐ │
│                                    │   多Agent审核委员会    │ │
│                                    ├───────────────────────┤ │
│                                    │ ┌─────┐ ┌─────┐ ┌───┐ │ │
│                                    │ │质量 │ │安全 │ │效率│ │ │
│                                    │ │Agent│ │Agent│ │Agent│ │
│                                    │ └─────┘ └─────┘ └───┘ │ │
│                                    └───────────────────────┘ │
│                                                │             │
│                                                ▼             │
│                                    ┌───────────────────────┐ │
│                                    │     自动决策引擎       │ │
│                                    │  通过 → 发布          │ │
│                                    │  不通过 → 迭代优化     │ │
│                                    └───────────────────────┘ │
│                                                │             │
│                                                ▼             │
│                                    ┌───────────────────────┐ │
│                                    │     评估指标输出       │ │
│                                    └───────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. 多Agent审核委员会

### 2.1 审核Agent定义

```yaml
quality_agent:
  名称: 质量审核Agent
  职责: 评估提示词的输出质量
  评估维度:
    - 格式正确性: 输出是否符合格式要求
    - 内容准确性: 输出是否正确完成任务
    - 一致性: 多次输出是否一致
    - 完整性: 是否遗漏必要内容
  输出: quality_score (0-100)

safety_agent:
  名称: 安全审核Agent
  职责: 评估提示词的安全性
  评估维度:
    - 幻觉风险: 是否容易产生幻觉
    - 越界风险: 是否可能超出任务边界
    - 注入风险: 是否容易被prompt注入
    - 稳定性: 边界情况处理是否安全
  输出: safety_score (0-100)

efficiency_agent:
  名称: 效率审核Agent
  职责: 评估提示词的效率
  评估维度:
    - Token效率: 输入输出token是否合理
    - 响应速度: 是否能快速响应
    - 成本效益: 效果与成本比
    - 简洁性: 提示词是否精简
  输出: efficiency_score (0-100)
```

### 2.2 审核流程

```yaml
审核流程:
  
  Step_1_测试执行:
    - 使用新版本提示词执行10个测试用例
    - 收集输出结果和指标
    
  Step_2_并行审核:
    - quality_agent 评估质量
    - safety_agent 评估安全
    - efficiency_agent 评估效率
    - 三个Agent并行执行
    
  Step_3_综合评分:
    - 计算加权总分
    - 对比基线版本
    - 生成改进幅度
    
  Step_4_自动决策:
    - 总分 >= 80 且 各项 >= 60 → 通过
    - 否则 → 不通过，返回优化引擎
```

### 2.3 审核Agent提示词

```markdown
# Quality Agent

## 任务
评估新版本提示词的输出质量。

## 输入
<input>
  <prompt_version>新版本提示词</prompt_version>
  <test_cases>测试用例列表</test_cases>
  <outputs>测试输出结果</outputs>
  <baseline_metrics>基线版本指标</baseline_metrics>
</input>

## 评估维度

### 1. 格式正确性 (0-25分)
- 输出是否符合指定格式？
- JSON/YAML是否可解析？
- 必填字段是否完整？

### 2. 内容准确性 (0-25分)
- 任务是否正确完成？
- 内容是否符合预期？
- 是否有明显错误？

### 3. 一致性 (0-25分)
- 多次执行结果是否一致？
- 风格是否统一？
- 术语使用是否一致？

### 4. 完整性 (0-25分)
- 是否遗漏必要内容？
- 边界情况是否处理？
- 错误情况是否覆盖？

## 输出格式
```json
{
  "quality_score": 85,
  "breakdown": {
    "format_correctness": 23,
    "content_accuracy": 22,
    "consistency": 20,
    "completeness": 20
  },
  "issues": [
    {
      "severity": "medium",
      "description": "在空输入情况下格式不正确",
      "suggestion": "添加空输入处理规则"
    }
  ],
  "comparison_to_baseline": {
    "improved": ["格式正确性提升5%"],
    "degraded": [],
    "unchanged": ["一致性保持稳定"]
  }
}
```
```

---

## 3. 自动决策引擎

### 3.1 决策规则

```yaml
通过条件 (全部满足):
  - total_score >= 80
  - quality_score >= 60
  - safety_score >= 70  # 安全要求更高
  - efficiency_score >= 60
  - 无 critical 级别问题
  - 相比基线无显著下降 (各项下降不超过5%)

不通过处理:
  - 记录失败原因
  - 将问题反馈给优化引擎
  - 触发新一轮优化
  - 最多3轮，3轮后标记为"需人工关注"

快速通过条件:
  - total_score >= 95
  - 各项均 >= 85
  - 相比基线全部提升
  → 跳过A/B测试，直接发布
```

### 3.2 决策输出

```json
{
  "decision": "approved | rejected | needs_attention",
  "version": "1.2.0",
  "scores": {
    "total": 87,
    "quality": 85,
    "safety": 92,
    "efficiency": 84
  },
  "baseline_comparison": {
    "total_change": "+8%",
    "quality_change": "+5%",
    "safety_change": "+2%",
    "efficiency_change": "+12%"
  },
  "action": {
    "type": "publish | ab_test | iterate | escalate",
    "details": "发布到生产环境"
  },
  "next_review": "2026-01-17T00:00:00Z"
}
```

---

## 4. 评估指标仪表盘

### 4.1 实时指标

```yaml
┌─────────────────────────────────────────────────────────────┐
│                    提示词健康度仪表盘                         │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  总体健康度: 92/100  ████████████████████░░░░ 🟢 健康        │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 指标            当前    基线    变化    趋势    状态     ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ 格式正确率      98.5%   97.2%   +1.3%   ↑      🟢       ││
│  │ 任务成功率      95.2%   93.8%   +1.4%   ↑      🟢       ││
│  │ 用户满意度      4.6/5   4.4/5   +0.2    ↑      🟢       ││
│  │ 平均Token       1,250   1,380   -9.4%   ↓      🟢       ││
│  │ 平均响应时间    2.1s    2.3s    -8.7%   ↓      🟢       ││
│  │ 返工率          3.2%    5.1%    -1.9%   ↓      🟢       ││
│  │ 安全评分        94/100  92/100  +2      ↑      🟢       ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  最近7天趋势:                                                │
│  成功率 ▁▂▃▄▅▆▇█ 持续上升                                   │
│  Token  █▇▆▅▄▃▂▁ 持续下降                                   │
│                                                              │
│  自动优化统计:                                               │
│  - 本周优化次数: 12                                          │
│  - 自动通过: 9 (75%)                                         │
│  - 需迭代: 3 (25%)                                           │
│  - 需人工: 0 (0%)                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 单提示词指标

```yaml
┌─────────────────────────────────────────────────────────────┐
│  提示词: requirement-understand  版本: 1.3.2                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  综合评分: 89/100                                            │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 质量评分    ████████████████████░░░░  85/100            ││
│  │ 安全评分    ██████████████████████░░  94/100            ││
│  │ 效率评分    ██████████████████████░░  88/100            ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  详细指标:                                                   │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 格式正确率      99.1%   ████████████████████░ 🟢        ││
│  │ 任务成功率      96.3%   ███████████████████░░ 🟢        ││
│  │ 一致性          94.5%   ███████████████████░░ 🟢        ││
│  │ 完整性          91.2%   ██████████████████░░░ 🟢        ││
│  │ 幻觉风险        2.1%    ░░░░░░░░░░░░░░░░░░░░░ 🟢 低     ││
│  │ 越界风险        1.5%    ░░░░░░░░░░░░░░░░░░░░░ 🟢 低     ││
│  │ 平均Token       1,180   ██████████████░░░░░░░ 🟢 优     ││
│  │ 平均响应        1.8s    ████████████░░░░░░░░░ 🟢 优     ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
│  版本历史:                                                   │
│  v1.3.2 (当前) - 综合89分 - 自动通过                         │
│  v1.3.1        - 综合82分 - 自动通过                         │
│  v1.3.0        - 综合78分 - 迭代后通过                       │
│  v1.2.x        - 综合75分 - 已废弃                           │
│                                                              │
│  下次评估: 7天后自动评估                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. 评估指标定义

### 5.1 核心指标

```yaml
# 质量指标 (Quality Metrics)

format_accuracy:
  定义: 输出格式正确的比例
  计算: 格式正确次数 / 总执行次数 × 100%
  目标: >= 98%
  权重: 15%

task_success_rate:
  定义: 任务成功完成的比例
  计算: 任务成功次数 / 总执行次数 × 100%
  目标: >= 95%
  权重: 25%

consistency_score:
  定义: 相同输入产生相似输出的程度
  计算: 1 - (输出变异度)
  目标: >= 90%
  权重: 10%

completeness_score:
  定义: 输出内容完整度
  计算: 包含必要元素次数 / 总次数 × 100%
  目标: >= 95%
  权重: 10%


# 安全指标 (Safety Metrics)

hallucination_rate:
  定义: 产生幻觉内容的比例
  计算: 幻觉次数 / 总次数 × 100%
  目标: <= 2%
  权重: 15%

boundary_violation_rate:
  定义: 超出任务边界的比例
  计算: 越界次数 / 总次数 × 100%
  目标: <= 1%
  权重: 10%

injection_resistance:
  定义: 抵抗prompt注入的能力
  计算: 通过注入测试用例比例
  目标: >= 99%
  权重: 5%


# 效率指标 (Efficiency Metrics)

avg_input_tokens:
  定义: 平均输入token数
  目标: 持续优化，低于基线
  权重: 5%

avg_output_tokens:
  定义: 平均输出token数
  目标: 在满足需求前提下最小化
  权重: 5%

avg_latency:
  定义: 平均响应时间
  目标: <= 3秒
  权重: 5%

cost_per_task:
  定义: 单任务成本
  计算: (input_tokens × $0.003 + output_tokens × $0.015) / 1000
  目标: 持续优化
  权重: 5%


# 用户指标 (User Metrics)

user_satisfaction:
  定义: 用户满意度评分
  来源: 用户反馈评分
  目标: >= 4.0 / 5.0
  权重: 10%

rework_rate:
  定义: 需要返工的比例
  计算: 返工次数 / 总次数 × 100%
  目标: <= 5%
  权重: 10%
```

### 5.2 综合评分计算

```python
def calculate_total_score(metrics):
    """计算综合评分"""
    
    # 质量分 (60分满分)
    quality_score = (
        metrics['format_accuracy'] * 0.15 +
        metrics['task_success_rate'] * 0.25 +
        metrics['consistency_score'] * 0.10 +
        metrics['completeness_score'] * 0.10
    ) * 100
    
    # 安全分 (30分满分)
    safety_score = (
        (100 - metrics['hallucination_rate']) * 0.15 +
        (100 - metrics['boundary_violation_rate']) * 0.10 +
        metrics['injection_resistance'] * 0.05
    ) * 100
    
    # 效率分 (10分满分)
    efficiency_score = calculate_efficiency_score(metrics)
    
    # 综合分
    total = quality_score + safety_score + efficiency_score
    
    return {
        'total': round(total, 1),
        'quality': round(quality_score, 1),
        'safety': round(safety_score, 1),
        'efficiency': round(efficiency_score, 1)
    }
```

### 5.3 健康度等级

```yaml
健康度等级:

  🟢 优秀 (90-100):
    - 所有指标达标
    - 无明显问题
    - 可作为范例

  🟡 良好 (80-89):
    - 核心指标达标
    - 存在小的改进空间
    - 正常运行

  🟠 一般 (70-79):
    - 部分指标未达标
    - 需要优化
    - 触发自动优化

  🔴 较差 (<70):
    - 多项指标未达标
    - 需要紧急优化
    - 考虑回滚到稳定版本
```

---

## 6. 指标输出API

### 6.1 获取总览指标

```yaml
GET /api/prompts/metrics/overview

Response:
{
  "timestamp": "2026-01-10T15:30:00Z",
  "overall_health": 92,
  "health_status": "excellent",
  
  "summary": {
    "total_prompts": 15,
    "healthy": 13,
    "needs_optimization": 2,
    "critical": 0
  },
  
  "aggregated_metrics": {
    "avg_format_accuracy": 98.5,
    "avg_task_success_rate": 95.2,
    "avg_user_satisfaction": 4.6,
    "total_token_savings": "12.5%",
    "avg_latency": "2.1s"
  },
  
  "trend_7d": {
    "health_change": "+3",
    "success_rate_change": "+1.4%",
    "cost_change": "-9.4%"
  },
  
  "auto_optimization": {
    "runs_this_week": 12,
    "auto_approved": 9,
    "iterations_needed": 3,
    "escalated": 0
  }
}
```

### 6.2 获取单提示词指标

```yaml
GET /api/prompts/{id}/metrics

Response:
{
  "prompt_id": "requirement-understand",
  "current_version": "1.3.2",
  "timestamp": "2026-01-10T15:30:00Z",
  
  "scores": {
    "total": 89,
    "quality": 85,
    "safety": 94,
    "efficiency": 88
  },
  
  "health_status": "good",
  
  "detailed_metrics": {
    "format_accuracy": 99.1,
    "task_success_rate": 96.3,
    "consistency_score": 94.5,
    "completeness_score": 91.2,
    "hallucination_rate": 2.1,
    "boundary_violation_rate": 1.5,
    "avg_input_tokens": 850,
    "avg_output_tokens": 330,
    "avg_latency_ms": 1800,
    "user_satisfaction": 4.6,
    "rework_rate": 3.2
  },
  
  "comparison_to_baseline": {
    "total_change": "+8%",
    "improvements": ["效率提升12%", "格式正确率提升1.3%"],
    "degradations": []
  },
  
  "version_history": [
    {"version": "1.3.2", "score": 89, "status": "production"},
    {"version": "1.3.1", "score": 82, "status": "deprecated"},
    {"version": "1.3.0", "score": 78, "status": "deprecated"}
  ],
  
  "next_scheduled_review": "2026-01-17T00:00:00Z",
  "last_optimization": "2026-01-08T10:00:00Z"
}
```

### 6.3 获取优化报告

```yaml
GET /api/prompts/{id}/optimization-report

Response:
{
  "prompt_id": "requirement-understand",
  "report_date": "2026-01-10",
  
  "optimization_summary": {
    "total_optimizations": 5,
    "successful": 4,
    "failed": 1,
    "avg_improvement": "+6.2%"
  },
  
  "latest_optimization": {
    "from_version": "1.3.1",
    "to_version": "1.3.2",
    "triggered_by": "weekly_analysis",
    "changes": [
      "添加空输入处理规则",
      "优化输出格式约束",
      "精简示例代码"
    ],
    "review_results": {
      "quality_agent": {"score": 85, "approved": true},
      "safety_agent": {"score": 94, "approved": true},
      "efficiency_agent": {"score": 88, "approved": true}
    },
    "decision": "approved",
    "improvement": "+7%"
  },
  
  "metrics_trend": {
    "7d": {"total": "+3", "quality": "+2", "efficiency": "+5"},
    "30d": {"total": "+12", "quality": "+8", "efficiency": "+15"}
  },
  
  "recommendations": [
    {
      "type": "minor_optimization",
      "description": "可进一步精简示例，预计节省5%token",
      "priority": "low",
      "estimated_impact": "+2%"
    }
  ]
}
```

---

## 7. 完整进化流程

```yaml
自动进化流程 (无人工干预):

  触发条件:
    - 定时: 每周一次全量评估
    - 异常: 成功率下降5%
    - 积累: 失败样本 > 10个

  Step_1_数据收集:
    - 收集最近7天执行数据
    - 提取失败样本
    - 计算当前指标

  Step_2_优化生成:
    - 分析失败原因
    - 生成优化建议
    - 创建新版本草稿

  Step_3_测试执行:
    - 执行10个标准测试用例
    - 执行5个边界测试用例
    - 收集输出结果

  Step_4_多Agent审核:
    - quality_agent 评估质量
    - safety_agent 评估安全
    - efficiency_agent 评估效率
    - 并行执行，约10秒完成

  Step_5_自动决策:
    if 综合分 >= 80 and 各项 >= 60:
      if 综合分 >= 95:
        → 直接发布
      else:
        → 10%流量A/B测试，24小时后自动评估
    else:
      if 迭代次数 < 3:
        → 返回Step_2重新优化
      else:
        → 标记"需关注"，保持当前版本

  Step_6_指标输出:
    - 更新仪表盘
    - 生成优化报告
    - 推送指标通知 (如配置)
```

---

## 8. 指标通知

```yaml
通知配置:

  每日摘要:
    时间: 每天早9点
    内容: 
      - 总体健康度
      - 异常提示词
      - 昨日优化结果
    渠道: Slack/邮件

  即时告警:
    条件:
      - 任何提示词健康度 < 70
      - 成功率下降 > 10%
      - 3次迭代仍未通过
    渠道: Slack/邮件/短信

  周度报告:
    时间: 每周一
    内容:
      - 各提示词指标变化
      - 优化效果统计
      - 成本节省统计
      - 改进建议
    渠道: 邮件
```

---

## 9. 总结

```yaml
核心价值:
  1. 全自动: 多Agent审核，无需人工干预
  2. 持续进化: 数据驱动的自动优化
  3. 透明可见: 只输出评估指标
  4. 安全可靠: 自动回滚机制

关键指标:
  - 综合评分: 0-100
  - 质量/安全/效率: 各0-100
  - 健康度等级: 优秀/良好/一般/较差

自动化程度:
  - 数据收集: 100%自动
  - 效果评估: 100%自动
  - 优化生成: 100%自动
  - 审核决策: 100%自动 (多Agent)
  - 发布回滚: 100%自动

人工介入:
  - 仅在连续3次迭代失败时提醒关注
  - 通过指标仪表盘了解系统状态
  - 无需日常审核
```
