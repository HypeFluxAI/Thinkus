/**
 * Plan-First Mode Service
 * 计划先行模式服务，先展示开发计划再开始执行
 */

import Anthropic from '@anthropic-ai/sdk'
import {
  DevelopmentPlan,
  PlanStep,
  PlanContext,
  PlanGenerationResult,
  PlanExecutionProgress,
  PlanModification,
  PlanStepStatus,
  PlanApprovalStatus
} from './types'
import { getSonnetModel } from '@/lib/ai/model-router'

export class PlanFirstService {
  private plans: Map<string, DevelopmentPlan> = new Map()
  private progress: Map<string, PlanExecutionProgress> = new Map()

  constructor(private claude?: Anthropic) {}

  /**
   * 设置Anthropic客户端
   */
  setClient(claude: Anthropic): void {
    this.claude = claude
  }

  /**
   * 生成开发计划
   */
  async generatePlan(
    projectId: string,
    sessionId: string,
    context: PlanContext
  ): Promise<PlanGenerationResult> {
    if (!this.claude) {
      return this.generateFallbackPlan(projectId, sessionId, context)
    }

    try {
      const response = await this.claude.messages.create({
        model: getSonnetModel(),
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `作为技术规划专家，请为以下需求生成详细的开发计划。

用户需求: ${context.userRequirement}
${context.technicalContext ? `技术背景: ${context.technicalContext}` : ''}
${context.constraints?.length ? `约束条件: ${context.constraints.join(', ')}` : ''}
${context.preferences?.length ? `用户偏好: ${context.preferences.join(', ')}` : ''}

请以JSON格式返回开发计划:
{
  "title": "计划标题",
  "overview": "计划概述(2-3句话)",
  "steps": [
    {
      "title": "步骤标题",
      "description": "详细描述",
      "estimatedDuration": "预计时长",
      "dependencies": [],
      "subSteps": [
        {"title": "子步骤1"},
        {"title": "子步骤2"}
      ]
    }
  ],
  "alternatives": [
    {
      "title": "替代方案标题",
      "description": "描述",
      "tradeoffs": ["优点", "缺点"]
    }
  ],
  "warnings": ["潜在风险或注意事项"]
}

只返回JSON。`
        }]
      })

      const textBlock = response.content.find(block => block.type === 'text')
      if (!textBlock || textBlock.type !== 'text') {
        throw new Error('No text response')
      }

      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found')
      }

      const data = JSON.parse(jsonMatch[0])

      const plan: DevelopmentPlan = {
        id: `plan-${projectId}-${Date.now()}`,
        projectId,
        sessionId,
        title: data.title || '开发计划',
        overview: data.overview || '',
        steps: (data.steps || []).map((step: Partial<PlanStep>, index: number) => ({
          id: `step-${index + 1}`,
          title: step.title || `步骤 ${index + 1}`,
          description: step.description || '',
          estimatedDuration: step.estimatedDuration,
          dependencies: step.dependencies || [],
          status: 'pending' as PlanStepStatus,
          order: index + 1,
          subSteps: step.subSteps?.map((sub, subIndex) => ({
            id: `step-${index + 1}-sub-${subIndex + 1}`,
            title: typeof sub === 'string' ? sub : sub.title,
            status: 'pending' as PlanStepStatus
          }))
        })),
        approvalStatus: 'pending',
        createdAt: new Date(),
        aiModel: getSonnetModel(),
        context
      }

      this.plans.set(plan.id, plan)

      return {
        plan,
        confidence: 0.85,
        alternatives: data.alternatives,
        warnings: data.warnings
      }
    } catch (error) {
      console.error('Plan generation failed:', error)
      return this.generateFallbackPlan(projectId, sessionId, context)
    }
  }

  /**
   * 降级计划生成
   */
  private generateFallbackPlan(
    projectId: string,
    sessionId: string,
    context: PlanContext
  ): PlanGenerationResult {
    const plan: DevelopmentPlan = {
      id: `plan-${projectId}-${Date.now()}`,
      projectId,
      sessionId,
      title: '开发计划',
      overview: `实现用户需求: ${context.userRequirement.slice(0, 100)}...`,
      steps: [
        {
          id: 'step-1',
          title: '需求分析',
          description: '分析用户需求，确定实现方案',
          status: 'pending',
          order: 1,
          dependencies: []
        },
        {
          id: 'step-2',
          title: '设计实现',
          description: '设计技术方案，编写代码',
          status: 'pending',
          order: 2,
          dependencies: ['step-1']
        },
        {
          id: 'step-3',
          title: '测试验证',
          description: '测试功能，修复问题',
          status: 'pending',
          order: 3,
          dependencies: ['step-2']
        }
      ],
      approvalStatus: 'pending',
      createdAt: new Date(),
      aiModel: 'fallback',
      context
    }

    this.plans.set(plan.id, plan)

    return {
      plan,
      confidence: 0.5,
      warnings: ['使用默认计划模板，建议手动调整']
    }
  }

  /**
   * 批准计划
   */
  approvePlan(planId: string): boolean {
    const plan = this.plans.get(planId)
    if (plan && plan.approvalStatus === 'pending') {
      plan.approvalStatus = 'approved'
      plan.approvedAt = new Date()

      // 初始化执行进度
      this.progress.set(planId, {
        planId,
        currentStepIndex: 0,
        completedSteps: 0,
        totalSteps: plan.steps.length,
        progressPercentage: 0,
        status: 'executing'
      })

      return true
    }
    return false
  }

  /**
   * 拒绝计划
   */
  rejectPlan(planId: string, reason?: string): boolean {
    const plan = this.plans.get(planId)
    if (plan && plan.approvalStatus === 'pending') {
      plan.approvalStatus = 'rejected'
      plan.userModifications = reason
      return true
    }
    return false
  }

  /**
   * 修改计划
   */
  modifyPlan(planId: string, modifications: PlanModification[]): boolean {
    const plan = this.plans.get(planId)
    if (!plan) return false

    for (const mod of modifications) {
      switch (mod.action) {
        case 'add':
          if (mod.newValue) {
            const newStep: PlanStep = {
              id: `step-${plan.steps.length + 1}`,
              title: mod.newValue.title || '新步骤',
              description: mod.newValue.description || '',
              status: 'pending',
              order: plan.steps.length + 1,
              dependencies: mod.newValue.dependencies || []
            }
            plan.steps.push(newStep)
          }
          break

        case 'remove':
          plan.steps = plan.steps.filter(s => s.id !== mod.stepId)
          break

        case 'modify':
          const stepToModify = plan.steps.find(s => s.id === mod.stepId)
          if (stepToModify && mod.newValue) {
            Object.assign(stepToModify, mod.newValue)
          }
          break

        case 'reorder':
          if (mod.newValue?.order !== undefined) {
            const stepToReorder = plan.steps.find(s => s.id === mod.stepId)
            if (stepToReorder) {
              stepToReorder.order = mod.newValue.order
            }
          }
          plan.steps.sort((a, b) => a.order - b.order)
          break
      }
    }

    plan.approvalStatus = 'modified'
    plan.modifiedAt = new Date()

    return true
  }

  /**
   * 更新步骤状态
   */
  updateStepStatus(planId: string, stepId: string, status: PlanStepStatus): boolean {
    const plan = this.plans.get(planId)
    if (!plan) return false

    const step = plan.steps.find(s => s.id === stepId)
    if (!step) return false

    step.status = status

    // 更新进度
    const progress = this.progress.get(planId)
    if (progress) {
      const completedSteps = plan.steps.filter(s => s.status === 'completed').length
      const currentIndex = plan.steps.findIndex(s => s.status === 'in_progress')

      progress.completedSteps = completedSteps
      progress.currentStepIndex = currentIndex >= 0 ? currentIndex : completedSteps
      progress.progressPercentage = Math.round((completedSteps / plan.steps.length) * 100)

      if (completedSteps === plan.steps.length) {
        progress.status = 'completed'
      }
    }

    return true
  }

  /**
   * 获取执行进度
   */
  getProgress(planId: string): PlanExecutionProgress | undefined {
    return this.progress.get(planId)
  }

  /**
   * 获取计划
   */
  getPlan(planId: string): DevelopmentPlan | undefined {
    return this.plans.get(planId)
  }

  /**
   * 获取项目的所有计划
   */
  getProjectPlans(projectId: string): DevelopmentPlan[] {
    return Array.from(this.plans.values())
      .filter(p => p.projectId === projectId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  /**
   * 暂停执行
   */
  pauseExecution(planId: string): boolean {
    const progress = this.progress.get(planId)
    if (progress && progress.status === 'executing') {
      progress.status = 'paused'
      return true
    }
    return false
  }

  /**
   * 恢复执行
   */
  resumeExecution(planId: string): boolean {
    const progress = this.progress.get(planId)
    if (progress && progress.status === 'paused') {
      progress.status = 'executing'
      return true
    }
    return false
  }

  /**
   * 生成计划展示文本
   */
  formatPlanForDisplay(plan: DevelopmentPlan): string {
    let display = `📋 ${plan.title}\n\n`
    display += `${plan.overview}\n\n`
    display += `步骤:\n`

    for (const step of plan.steps) {
      const statusIcon = {
        pending: '⬜',
        in_progress: '🔄',
        completed: '✅',
        skipped: '⏭️',
        failed: '❌'
      }[step.status]

      display += `${statusIcon} ${step.order}. ${step.title}\n`
      display += `   ${step.description}\n`

      if (step.subSteps?.length) {
        for (const sub of step.subSteps) {
          const subIcon = sub.status === 'completed' ? '✓' : '○'
          display += `   ${subIcon} ${sub.title}\n`
        }
      }
      display += '\n'
    }

    return display
  }

  /**
   * 清理计划
   */
  clear(planId: string): void {
    this.plans.delete(planId)
    this.progress.delete(planId)
  }
}

export const planFirstService = new PlanFirstService()
