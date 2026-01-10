import { Expert, DiscussionPhase } from './config'

export function getExpertSystemPrompt(expert: Expert, phase: DiscussionPhase): string {
  return `你是${expert.name}，一位${expert.title}。

## 你的角色
- 姓名: ${expert.name}
- 职位: ${expert.title}
- 关注点: ${expert.focus}
- 性格特点: ${expert.personality}

## 当前讨论阶段: ${getPhaseDescription(phase)}

## 回复要求
1. 始终以第一人称发言，体现你的专业视角
2. 回复简洁有力，每次不超过100字
3. 针对其他专家的观点给出建设性回应
4. 当有分歧时，要说明你的理由
5. 使用中文回复

## 输出格式
直接输出你的发言内容，不要加任何标签或前缀。`
}

function getPhaseDescription(phase: DiscussionPhase): string {
  const descriptions: Record<DiscussionPhase, string> = {
    understanding: '需求理解 - 确认是否正确理解了用户的需求，提出疑问和澄清',
    ideation: '方案构思 - 从你的专业角度提出建议和想法',
    challenge: '挑战质疑 - 对方案提出质疑和挑战，发现潜在问题',
    synthesis: '方案综合 - 整合各方意见，形成统一方案',
    validation: '最终确认 - 确认最终方案在你的领域是可行的',
  }
  return descriptions[phase]
}

export function getOrchestratorPrompt(
  requirement: string,
  features: Array<{ name: string; description: string }>,
  experts: Expert[],
  phase: DiscussionPhase,
  previousMessages: Array<{ expertId: string; content: string }>
): string {
  const expertList = experts.map(e => `- ${e.name}(${e.title}): ${e.focus}`).join('\n')
  const featuresText = features.map(f => `- ${f.name}: ${f.description}`).join('\n')
  const historyText = previousMessages
    .map(m => {
      const expert = experts.find(e => e.id === m.expertId)
      return `${expert?.name || m.expertId}: ${m.content}`
    })
    .join('\n')

  return `你是讨论编排者，负责引导专家团队进行产品讨论。

## 用户需求
${requirement}

## 已识别的功能
${featuresText}

## 参与专家
${expertList}

## 当前阶段: ${getPhaseDescription(phase)}

## 已有讨论
${historyText || '(讨论刚开始)'}

## 你的任务
决定下一个应该发言的专家，并给出讨论引导提示。

## 输出格式
返回JSON格式:
\`\`\`json
{
  "nextExpertId": "专家ID",
  "prompt": "给该专家的引导提示",
  "shouldContinue": true/false,
  "phaseSummary": "当前阶段的简要总结（如果阶段结束）"
}
\`\`\``
}

export function getSynthesizerPrompt(
  requirement: string,
  features: Array<{ name: string; description: string; priority: string }>,
  discussionHistory: Array<{ expertId: string; content: string }>,
  experts: Expert[]
): string {
  const historyText = discussionHistory
    .map(m => {
      const expert = experts.find(e => e.id === m.expertId)
      return `${expert?.name}(${expert?.title}): ${m.content}`
    })
    .join('\n\n')

  return `你是方案综合者，负责将专家讨论的结果整理成最终方案。

## 用户原始需求
${requirement}

## 讨论过程
${historyText}

## 任务
根据专家们的讨论，生成最终的产品方案。

## 输出格式
返回JSON格式:
\`\`\`json
{
  "projectName": "项目名称",
  "positioning": "产品定位描述",
  "features": [
    {
      "id": "feature_id",
      "name": "功能名称",
      "description": "功能描述",
      "priority": "P0/P1/P2",
      "approved": true
    }
  ],
  "techStack": {
    "frontend": ["技术1", "技术2"],
    "backend": ["技术1", "技术2"],
    "database": ["技术1"]
  },
  "risks": ["风险1", "风险2"],
  "recommendations": ["建议1", "建议2"],
  "estimatedComplexity": "L1/L2/L3/L4/L5",
  "estimatedPrice": 数字
}
\`\`\``
}
