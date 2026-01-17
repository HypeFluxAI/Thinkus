# 记忆系统评估方案

> 全面评估AI员工记忆系统的功能、质量和性能

---

## 一、评估目标

### 核心问题
1. **记得住** - 重要信息是否被正确保存？
2. **找得到** - 相关信息是否能被检索？
3. **用得对** - 记忆是否正确影响AI响应？
4. **忘得掉** - 过时信息是否会被淘汰？
5. **不串台** - 多用户/项目是否严格隔离？

---

## 二、评估维度

### 2.1 功能测试 (Functional Tests)

| 测试项 | 描述 | 验收标准 |
|--------|------|----------|
| F1. 写入筛选 | 只保存高价值信息 | 评分≥2/4才写入 |
| F2. 检索准确 | 相关记忆被检索 | 召回率≥80% |
| F3. 上下文注入 | 记忆正确注入prompt | 响应包含记忆内容 |
| F4. 置信度修正 | 证据影响置信度 | 正向+、反向- |
| F5. 时间衰减 | 旧记忆衰减 | 30天后decay<0.5 |
| F6. 记忆合并 | 相似记忆合并 | similarity>0.85合并 |
| F7. 分层注入 | Core优先注入 | Core始终出现 |
| F8. 预算控制 | 不超token限制 | ≤800 tokens |
| F9. 项目隔离 | 不同项目独立 | 跨项目零检索 |

### 2.2 质量指标 (Quality Metrics)

| 指标 | 公式 | 目标值 |
|------|------|--------|
| **精确率 (Precision)** | 相关检索数 / 总检索数 | ≥75% |
| **召回率 (Recall)** | 相关检索数 / 应检索总数 | ≥80% |
| **F1分数** | 2×P×R / (P+R) | ≥0.77 |
| **记忆利用率** | 被使用记忆数 / 总记忆数 | ≥50% |
| **Token效率** | 有效信息tokens / 总注入tokens | ≥70% |
| **响应相关性** | AI响应使用记忆比例 | ≥80% |

### 2.3 边界测试 (Edge Cases)

| 测试场景 | 预期行为 |
|----------|----------|
| E1. 空对话 | 不保存记忆 |
| E2. 纯闲聊 | 不保存记忆 |
| E3. 矛盾信息 | 旧记忆降权，新记忆保存 |
| E4. 大量记忆 | 预算控制生效，优先级排序 |
| E5. 长时间无访问 | 记忆正确衰减 |
| E6. 同一信息重复 | 合并而非重复保存 |
| E7. 跨项目查询 | 返回空结果 |

---

## 三、测试用例设计

### 3.1 基础场景测试

```yaml
场景1: 用户偏好记忆
  输入: "I always prefer TypeScript over JavaScript"
  预期:
    - 记忆被保存 (type=preference)
    - 评分≥2.0 (persistence高, relevance高)
    - 后续问"What language should I use?" 返回TypeScript建议

场景2: 项目事实记忆
  输入: "My project is called SuperApp, targeting small businesses"
  预期:
    - 记忆被保存 (type=fact)
    - 后续问"What is my project name?" 返回SuperApp

场景3: 决策记忆
  输入: "We decided to use MongoDB for the database"
  预期:
    - 记忆被保存 (type=decision)
    - 后续问"What database did we choose?" 返回MongoDB

场景4: 低价值信息过滤
  输入: "Hello, how are you today?"
  预期:
    - 不保存任何记忆 (评分过低)
```

### 3.2 记忆修正测试

```yaml
场景5: 信息更正
  步骤1: "Our tech stack is React"
  步骤2: "Actually, we switched to Vue.js"
  预期:
    - React记忆置信度下降
    - Vue.js记忆被保存
    - 后续查询返回Vue.js

场景6: 信息强化
  步骤1: "We use PostgreSQL"
  步骤2: "PostgreSQL has been great for our needs"
  预期:
    - PostgreSQL记忆support++
    - 置信度提升
```

### 3.3 隔离测试

```yaml
场景7: 项目隔离
  项目A: "Project Alpha uses Python"
  项目B: "Project Beta uses Go"
  预期:
    - 在项目A查询不返回Go
    - 在项目B查询不返回Python

场景8: 员工隔离
  Mike: 保存产品相关记忆
  David: 保存技术相关记忆
  预期:
    - 各员工namespace独立
    - 不跨员工检索
```

### 3.4 性能测试

```yaml
场景9: 大量记忆
  操作: 保存100条记忆
  预期:
    - 检索仍在合理时间内(<2s)
    - Token预算控制生效

场景10: 并发访问
  操作: 同时5个对话保存/检索
  预期:
    - 无数据竞争
    - 各对话独立
```

---

## 四、自动化测试脚本

### 4.1 测试框架结构

```
tests/memory/
├── __init__.py
├── test_scorer.py          # 评分系统测试
├── test_retriever.py       # 检索系统测试
├── test_corrector.py       # 修正系统测试
├── test_decay.py           # 衰减系统测试
├── test_merger.py          # 合并系统测试
├── test_integration.py     # 集成测试
├── test_isolation.py       # 隔离测试
├── test_e2e.py             # 端到端测试
├── evaluation_runner.py    # 评估运行器
└── EVALUATION_PLAN.md      # 本文档
```

### 4.2 评估指标计算

```python
class MemoryEvaluator:
    def calculate_precision(self, retrieved, relevant):
        """精确率 = 相关且被检索 / 总检索"""
        if not retrieved:
            return 0
        correct = sum(1 for r in retrieved if r in relevant)
        return correct / len(retrieved)

    def calculate_recall(self, retrieved, relevant):
        """召回率 = 相关且被检索 / 总相关"""
        if not relevant:
            return 0
        correct = sum(1 for r in relevant if r in retrieved)
        return correct / len(relevant)

    def calculate_f1(self, precision, recall):
        """F1 = 2×P×R / (P+R)"""
        if precision + recall == 0:
            return 0
        return 2 * precision * recall / (precision + recall)
```

---

## 五、评估流程

### 步骤1: 环境准备
- 清空测试项目的记忆
- 确认服务健康

### 步骤2: 功能测试 (F1-F9)
- 运行各功能测试用例
- 记录通过/失败

### 步骤3: 场景测试 (场景1-10)
- 执行完整对话场景
- 验证记忆行为

### 步骤4: 指标计算
- 计算Precision/Recall/F1
- 计算Token效率

### 步骤5: 生成报告
- 汇总测试结果
- 标注问题和建议

---

## 六、成功标准

### 必须通过 (Must Pass)
- [ ] F1-F9 功能测试全部通过
- [ ] 项目隔离测试通过
- [ ] 员工隔离测试通过

### 质量目标 (Quality Goals)
- [ ] Precision ≥ 75%
- [ ] Recall ≥ 80%
- [ ] F1 ≥ 0.77
- [ ] Token效率 ≥ 70%

### 可选增强 (Nice to Have)
- [ ] 响应时间 < 2s
- [ ] 并发无错误
- [ ] 边界用例全通过

---

## 七、持续监控

### 上线后监控指标
1. 记忆保存成功率
2. 记忆检索响应时间
3. Token使用量/对话
4. 记忆命中率
5. 用户满意度反馈
