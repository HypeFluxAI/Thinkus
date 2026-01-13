/**
 * AI高管团队提示词 (v11)
 *
 * 支持AI自治系统的四大引擎：
 * 1. 数据感知引擎 - 监控数据变化
 * 2. 工作调度引擎 - 智能安排讨论
 * 3. 决策分级引擎 - 评估风险等级
 * 4. 执行追踪引擎 - 追踪执行状态
 */

import {
  AIExecutive,
  AgentId,
  AI_EXECUTIVES,
  UserExecutive,
} from '@/lib/config/ai-executives'

// ============================================================================
// 高管系统提示词
// ============================================================================

/**
 * 获取高管基础系统提示词
 */
export function getExecutiveSystemPrompt(executive: AIExecutive): string {
  return `你是${executive.name}，Thinkus的${executive.title}。

## 背景
${executive.background}

## 性格特点
${executive.personality.map(p => `- ${p}`).join('\n')}

## 专业能力
${executive.expertise.map(e => `- ${e}`).join('\n')}

## 工作方式
${executive.workStyle.map(w => `${executive.workStyle.indexOf(w) + 1}. ${w}`).join('\n')}

## 输出格式
当被要求产出文档时，使用结构化的Markdown格式。`
}

/**
 * 构建完整的高管Prompt（运行时注入）
 */
export function buildAgentPrompt(params: {
  executive: AIExecutive
  userPreferences?: UserExecutive['learnedPreferences']
  memories?: string[]
  project?: {
    name: string
    phase: string
    description: string
  }
  topic: string
}): string {
  const { executive, userPreferences, memories, project, topic } = params

  let prompt = `# 角色设定
${getExecutiveSystemPrompt(executive)}

`

  // 用户偏好
  if (userPreferences && Object.keys(userPreferences).length > 0) {
    prompt += `# 用户偏好
${formatPreferences(userPreferences)}

`
  }

  // 记忆上下文
  if (memories && memories.length > 0) {
    prompt += `# 相关记忆
${memories.map(m => `- ${m}`).join('\n')}

`
  }

  // 项目信息
  if (project) {
    prompt += `# 当前项目
项目：${project.name}
阶段：${project.phase}
描述：${project.description}

`
  }

  // 当前话题
  prompt += `# 当前话题
${topic}

请基于以上背景，以${executive.name}的身份回应。
记住：你只服务于这一位用户，你对他/她的了解都来自以上记忆。`

  return prompt
}

/**
 * 格式化用户偏好
 */
function formatPreferences(preferences: UserExecutive['learnedPreferences']): string {
  const lines: string[] = []

  if (preferences.communicationStyle) {
    const styleNames: Record<string, string> = {
      formal: '正式',
      casual: '轻松',
      concise: '简洁',
      detailed: '详细',
    }
    lines.push(`- 沟通风格偏好：${styleNames[preferences.communicationStyle] || preferences.communicationStyle}`)
  }
  if (preferences.focusAreas?.length) {
    lines.push(`- 关注领域：${preferences.focusAreas.join('、')}`)
  }
  if (preferences.dislikes?.length) {
    lines.push(`- 注意避免：${preferences.dislikes.join('、')}`)
  }
  if (preferences.decisionStyle) {
    const styleNames: Record<string, string> = {
      fast: '快速决策',
      careful: '谨慎决策',
      'data-driven': '数据驱动',
    }
    lines.push(`- 决策风格：${styleNames[preferences.decisionStyle] || preferences.decisionStyle}`)
  }
  if (preferences.customInstructions) {
    lines.push(`- 特别指示：${preferences.customInstructions}`)
  }

  return lines.length > 0 ? lines.join('\n') : '暂无特别偏好记录'
}

// ============================================================================
// 数据感知引擎提示词
// ============================================================================

/**
 * 数据变化分析提示词
 */
export function getDataSensingPrompt(data: {
  sourceId: string
  sourceName: string
  previousData: any
  currentData: any
  changeDescription: string
}): string {
  return `分析以下数据变化，判断是否有显著变化需要关注：

## 数据源
ID: ${data.sourceId}
名称: ${data.sourceName}

## 变化描述
${data.changeDescription}

## 数据对比
之前: ${JSON.stringify(data.previousData, null, 2)}
现在: ${JSON.stringify(data.currentData, null, 2)}

## 判断标准
1. 是否有异常数值？
2. 是否有明显趋势？
3. 是否有潜在风险？
4. 是否有新机会？

## 输出格式
返回JSON格式：
\`\`\`json
{
  "hasSignificantChange": true/false,
  "changeType": "anomaly|trend|opportunity|risk",
  "severity": "low|medium|high|critical",
  "title": "变化标题",
  "description": "变化描述",
  "suggestedAction": "建议操作",
  "affectedAreas": ["受影响的领域"],
  "urgency": "immediate|soon|later"
}
\`\`\``
}

// ============================================================================
// 工作调度引擎提示词
// ============================================================================

/**
 * 话题关键词分析提示词
 */
export function getTopicAnalysisPrompt(topic: string): string {
  return `从以下话题中提取关键领域标签，只返回JSON数组：

话题：${topic}

可选标签：
- pricing: 定价相关
- legal: 法律相关
- security: 安全相关
- data: 数据分析相关
- growth: 增长相关
- design: 设计相关
- tech: 技术相关
- marketing: 营销相关
- content: 内容相关
- funding: 融资相关
- strategy: 战略相关
- sales: 销售相关
- support: 客户支持相关
- monitoring: 监控运维相关

返回格式：["tag1", "tag2"]`
}

/**
 * 复杂度评估提示词
 */
export function getComplexityAssessmentPrompt(topic: string): string {
  return `评估以下讨论话题的复杂度：

话题：${topic}

## 评估维度
1. 涉及多少个专业领域？
2. 需要多深入的分析？
3. 决策影响范围多大？
4. 是否有时间紧迫性？

## 输出格式
返回JSON格式：
\`\`\`json
{
  "complexity": "simple|medium|complex",
  "suggestedParticipants": 3-8,
  "estimatedRounds": 2-5,
  "reason": "评估理由"
}
\`\`\``
}

// ============================================================================
// 决策分级引擎提示词
// ============================================================================

/**
 * 决策风险评估提示词
 */
export function getDecisionClassificationPrompt(decision: {
  title: string
  description: string
  category: string
  proposedAction: string
}): string {
  return `评估以下决策的风险等级：

## 决策信息
标题：${decision.title}
描述：${decision.description}
类别：${decision.category}
提议操作：${decision.proposedAction}

## 评估维度（每个维度0-20分）
1. **影响范围**：影响多少用户或功能
2. **可逆性**：能否轻松回滚
3. **资金影响**：涉及的金额大小
4. **安全影响**：对数据和隐私的影响
5. **法律风险**：合规和法律风险

## 决策级别说明
- L0 (0-20分): 自动执行，不通知（如Bug修复、文案微调）
- L1 (21-50分): 先执行后通知（如小功能添加）
- L2 (51-80分): 先确认再执行（如核心功能修改）
- L3 (81-100分): 必须详细确认（如安全、法律、大额支出）

## 输出格式
返回JSON格式：
\`\`\`json
{
  "factors": [
    {"name": "影响范围", "score": 0-20, "reason": "..."},
    {"name": "可逆性", "score": 0-20, "reason": "..."},
    {"name": "资金影响", "score": 0-20, "reason": "..."},
    {"name": "安全影响", "score": 0-20, "reason": "..."},
    {"name": "法律风险", "score": 0-20, "reason": "..."}
  ],
  "totalScore": 0-100,
  "level": "L0|L1|L2|L3",
  "recommendation": "auto_execute|execute_notify|confirm_first|critical_review",
  "rationale": "决策理由"
}
\`\`\``
}

// ============================================================================
// 执行追踪引擎提示词
// ============================================================================

/**
 * 执行结果分析提示词
 */
export function getExecutionAnalysisPrompt(execution: {
  decisionTitle: string
  action: string
  logs: string[]
  result: 'success' | 'failure' | 'partial'
  error?: string
}): string {
  return `分析以下执行结果：

## 决策信息
决策：${execution.decisionTitle}
操作：${execution.action}
结果：${execution.result}
${execution.error ? `错误：${execution.error}` : ''}

## 执行日志
${execution.logs.map((log, i) => `${i + 1}. ${log}`).join('\n')}

## 分析任务
1. 评估执行是否成功达到预期目标
2. 识别可能的问题或风险
3. 建议后续操作

## 输出格式
返回JSON格式：
\`\`\`json
{
  "success": true/false,
  "summary": "执行结果摘要",
  "issues": ["发现的问题"],
  "nextSteps": ["建议的后续操作"],
  "needsRollback": true/false,
  "rollbackReason": "如需回滚的原因",
  "userNotificationNeeded": true/false,
  "notificationContent": "如需通知用户的内容"
}
\`\`\``
}

// ============================================================================
// 多高管讨论提示词
// ============================================================================

/**
 * 讨论编排提示词
 */
export function getDiscussionOrchestratorPrompt(params: {
  topic: string
  participants: AgentId[]
  previousMessages: { agentId: AgentId | 'user' | string; content: string }[]
  roundNumber: number
}): string {
  const { topic, participants, previousMessages, roundNumber } = params
  const participantNames = participants.map(id => {
    const exec = AI_EXECUTIVES[id]
    return `${exec.name}(${exec.title})`
  }).join('、')

  const historyText = previousMessages.length > 0
    ? previousMessages.map(m => {
        if (m.agentId === 'user') {
          return `【用户】: ${m.content}`
        }
        const exec = AI_EXECUTIVES[m.agentId as AgentId]
        return exec ? `【${exec.name}】: ${m.content}` : `【${m.agentId}】: ${m.content}`
      }).join('\n\n')
    : '(讨论刚开始)'

  return `## 讨论编排

## 话题
${topic}

## 参与高管
${participantNames}

## 当前轮次
第 ${roundNumber} 轮

## 讨论历史
${historyText}

## 你的任务
决定下一个发言的高管，并给出引导提示。

## 输出格式
返回JSON格式：
\`\`\`json
{
  "nextAgentId": "高管ID",
  "prompt": "给该高管的引导提示",
  "shouldContinue": true/false,
  "reason": "继续或结束的原因",
  "keyPoints": ["本轮讨论的要点"]
}
\`\`\``
}

/**
 * 高管发言提示词
 */
export function getAgentResponsePrompt(params: {
  agentId: AgentId
  topic: string
  previousMessages: { agentId: AgentId | 'user' | string; content: string }[]
  orchestratorGuidance?: string
}): string {
  const { agentId, topic, previousMessages, orchestratorGuidance } = params
  const executive = AI_EXECUTIVES[agentId]

  const historyText = previousMessages.length > 0
    ? previousMessages.slice(-10).map(m => {
        if (m.agentId === 'user') {
          return `【用户】: ${m.content}`
        }
        const exec = AI_EXECUTIVES[m.agentId as AgentId]
        return exec ? `【${exec.name}】: ${m.content}` : `【${m.agentId}】: ${m.content}`
      }).join('\n\n')
    : '(你是第一个发言)'

  return `## 讨论话题
${topic}

## 讨论历史
${historyText}

${orchestratorGuidance ? `## 编排者引导
${orchestratorGuidance}
` : ''}
## 你的任务
现在轮到你（${executive.name}，${executive.title}）发言了。

请从你的专业角度：
1. 回应之前讨论中提到的相关观点
2. 提出你的新想法或补充
3. 如果有不同意见，明确表达并说明理由

注意：
- 每次发言保持100-200字
- 不要重复之前已经说过的内容
- 使用中文回复
- 直接输出发言内容，不要加任何标签`
}

/**
 * 讨论总结提示词
 */
export function getDiscussionSummaryPrompt(messages: { agentId: AgentId | 'user' | string; content: string }[]): string {
  const historyText = messages.map(m => {
    if (m.agentId === 'user') {
      return `【用户】: ${m.content}`
    }
    const exec = AI_EXECUTIVES[m.agentId as AgentId]
    return exec ? `【${exec.name}(${exec.title})】: ${m.content}` : `【${m.agentId}】: ${m.content}`
  }).join('\n\n')

  return `## 讨论内容
${historyText}

## 你的任务
总结这次讨论的要点，生成结构化的讨论结果。

## 输出格式
返回JSON格式：
\`\`\`json
{
  "summary": "讨论摘要（2-3句话）",
  "keyDecisions": [
    {
      "decision": "决策内容",
      "proposedBy": "提议高管ID",
      "supportedBy": ["支持高管ID列表"]
    }
  ],
  "actionItems": [
    {
      "action": "待办事项",
      "owner": "负责高管ID",
      "priority": "high|medium|low"
    }
  ],
  "openQuestions": ["未解决的问题"],
  "consensus": ["达成共识的要点"],
  "disagreements": ["存在分歧的要点"]
}
\`\`\``
}

// ============================================================================
// 定时任务提示词
// ============================================================================

/**
 * 每日站会提示词
 */
export function getDailyStandupPrompt(params: {
  projectName: string
  projectPhase: string
  yesterday: string
  blockers?: string[]
}): string {
  return `## 每日站会

## 项目信息
项目：${params.projectName}
阶段：${params.projectPhase}

## 昨日进展
${params.yesterday}

${params.blockers?.length ? `## 当前阻塞
${params.blockers.map(b => `- ${b}`).join('\n')}
` : ''}

## 站会目标
1. 回顾昨日完成的工作
2. 规划今日的任务
3. 识别和解决阻塞问题

请各位高管简要汇报和讨论。`
}

/**
 * 每周复盘提示词
 */
export function getWeeklyReviewPrompt(params: {
  projectName: string
  weekNumber: number
  accomplishments: string[]
  metrics: Record<string, number>
  issues: string[]
}): string {
  return `## 每周复盘

## 项目信息
项目：${params.projectName}
周数：第 ${params.weekNumber} 周

## 本周成果
${params.accomplishments.map(a => `- ${a}`).join('\n')}

## 关键指标
${Object.entries(params.metrics).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## 遇到的问题
${params.issues.map(i => `- ${i}`).join('\n')}

## 复盘目标
1. 总结本周的进展和成果
2. 分析指标变化的原因
3. 讨论问题的解决方案
4. 规划下周的重点工作

请各位高管从各自专业角度进行分析和建议。`
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 生成高管团队介绍
 */
export function generateExecutiveTeamIntro(): string {
  const categories: Record<string, AgentId[]> = {
    '产品设计组': ['mike', 'elena', 'rachel', 'chloe'],
    '技术组': ['david', 'james', 'kevin', 'alex'],
    '增长运营组': ['lisa', 'marcus', 'nina', 'sarah'],
    '财务法务组': ['frank', 'tom', 'iris'],
    '战略支持组': ['nathan', 'oscar', 'victor'],
  }

  let intro = `## AI高管团队

您拥有一支专属的AI高管团队，共18位专业人员，他们只为您工作，了解您的项目和偏好。

`

  for (const [category, ids] of Object.entries(categories)) {
    intro += `### ${category}\n\n`
    for (const id of ids) {
      const exec = AI_EXECUTIVES[id]
      intro += `**${exec.name}** - ${exec.title}\n`
      intro += `${exec.background.slice(0, 50)}...\n\n`
    }
  }

  intro += `### 工作模式

- **每日站会**: 回顾进展，规划任务
- **每周复盘**: 分析数据，调整方向
- **随时讨论**: 有问题随时召集相关高管讨论
- **自动优化**: 低风险操作自动执行，重要决策请示您

您是CEO，高管团队为您服务。`

  return intro
}
