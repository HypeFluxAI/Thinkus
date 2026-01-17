/**
 * Microservice Orchestrator
 * Coordinates interactions between all microservices
 */

import * as analyticsService from '../grpc/analytics'
import * as sandboxService from '../grpc/sandbox'
import * as pyService from '../grpc/py-service'
import * as aiEngine from '../grpc/ai-engine'

// Types
export interface Task {
  id: string
  type: TaskType
  projectId: string
  userId: string
  input: Record<string, any>
  status: TaskStatus
  result?: Record<string, any>
  error?: string
  createdAt: Date
  updatedAt: Date
}

export enum TaskType {
  CODE_EXECUTION = 'code_execution',
  DOCUMENT_PROCESSING = 'document_processing',
  AI_CHAT = 'ai_chat',
  AI_DISCUSSION = 'ai_discussion',
  ANALYTICS_REPORT = 'analytics_report',
  FULL_WORKFLOW = 'full_workflow'
}

export enum TaskStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface WorkflowStep {
  name: string
  service: 'analytics' | 'sandbox' | 'document' | 'ai-engine'
  action: string
  input: Record<string, any>
  dependsOn?: string[]
}

export interface WorkflowResult {
  success: boolean
  steps: {
    name: string
    status: 'completed' | 'failed' | 'skipped'
    result?: any
    error?: string
    duration: number
  }[]
  totalDuration: number
}

/**
 * MicroserviceOrchestrator coordinates all microservices
 */
export class MicroserviceOrchestrator {
  /**
   * Execute code in a sandbox
   */
  async executeCode(
    projectId: string,
    userId: string,
    code: string,
    language: 'node' | 'python' = 'node'
  ): Promise<{ exitCode: number; stdout: string; stderr: string }> {
    // Get or create sandbox
    const sandbox = await sandboxService.getOrCreate(projectId, userId, {
      image: language,
      cpuLimit: 1000,
      memoryLimit: 512,
      timeout: 300
    })

    // Write code to file
    const filename = language === 'python' ? 'main.py' : 'main.js'
    await sandboxService.writeFile(sandbox.id, filename, code)

    // Execute code
    const command = language === 'python' ? `python ${filename}` : `node ${filename}`
    const result = await sandboxService.exec(sandbox.id, command, 60)

    // Track execution
    await analyticsService.track({
      projectId,
      event: 'code_execution',
      sessionId: userId,
      data: {
        language,
        exitCode: String(result.exitCode),
        duration: String(result.duration)
      }
    })

    return result
  }

  /**
   * Process documents and integrate requirements
   */
  async processDocuments(
    projectId: string,
    files: Array<{ name: string; content: Buffer; mimeType: string }>
  ): Promise<any> {
    // Process files
    const processed = await pyService.processFiles(projectId, files)

    // Track processing
    await analyticsService.track({
      projectId,
      event: 'document_processed',
      sessionId: 'system',
      data: {
        fileCount: String(files.length)
      }
    })

    return processed
  }

  /**
   * Chat with an AI employee
   */
  async chatWithEmployee(
    employeeId: string,
    projectId: string,
    userId: string,
    message: string,
    context?: aiEngine.Message[]
  ): Promise<aiEngine.ChatResponse> {
    const response = await aiEngine.chat({
      employeeId,
      projectId,
      userId,
      message,
      context
    })

    // Track AI interaction
    await analyticsService.track({
      projectId,
      event: 'ai_chat',
      sessionId: userId,
      data: {
        employeeId,
        tokensUsed: String(response.tokensUsed)
      }
    })

    return response
  }

  /**
   * Start an AI discussion with multiple employees
   */
  async startAIDiscussion(
    projectId: string,
    userId: string,
    topic: string,
    employeeIds: string[],
    initialMessage: string
  ): Promise<aiEngine.Discussion> {
    const discussion = await aiEngine.startDiscussion(
      projectId,
      userId,
      topic,
      employeeIds,
      initialMessage
    )

    // Track discussion start
    await analyticsService.track({
      projectId,
      event: 'ai_discussion_started',
      sessionId: userId,
      data: {
        discussionId: discussion.id,
        participantCount: String(employeeIds.length)
      }
    })

    return discussion
  }

  /**
   * Generate analytics report
   */
  async generateAnalyticsReport(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<{
    stats: analyticsService.ProjectStats
    trends: analyticsService.TrendData[]
    topPages: analyticsService.PageView[]
  }> {
    const period = {
      start: startDate,
      end: endDate
    }

    // Fetch all analytics data in parallel
    const [stats, trends, topPages] = await Promise.all([
      analyticsService.getStats(projectId, period),
      analyticsService.getTrends(projectId, 'page_views', period),
      analyticsService.getTopPages(projectId, period, 10)
    ])

    return { stats, trends, topPages }
  }

  /**
   * Execute a multi-step workflow
   */
  async executeWorkflow(
    projectId: string,
    userId: string,
    steps: WorkflowStep[]
  ): Promise<WorkflowResult> {
    const startTime = Date.now()
    const results: WorkflowResult['steps'] = []
    const stepResults: Record<string, any> = {}

    for (const step of steps) {
      const stepStartTime = Date.now()

      // Check dependencies
      if (step.dependsOn) {
        const missingDeps = step.dependsOn.filter(
          dep => !stepResults[dep] || stepResults[dep].status === 'failed'
        )
        if (missingDeps.length > 0) {
          results.push({
            name: step.name,
            status: 'skipped',
            error: `Missing dependencies: ${missingDeps.join(', ')}`,
            duration: 0
          })
          continue
        }
      }

      try {
        let result: any

        switch (step.service) {
          case 'analytics':
            result = await this.executeAnalyticsStep(step.action, step.input, projectId)
            break
          case 'sandbox':
            result = await this.executeSandboxStep(step.action, step.input, projectId, userId)
            break
          case 'document':
            result = await this.executeDocumentStep(step.action, step.input, projectId)
            break
          case 'ai-engine':
            result = await this.executeAIStep(step.action, step.input, projectId, userId)
            break
        }

        stepResults[step.name] = { status: 'completed', result }
        results.push({
          name: step.name,
          status: 'completed',
          result,
          duration: Date.now() - stepStartTime
        })
      } catch (error: any) {
        stepResults[step.name] = { status: 'failed', error: error.message }
        results.push({
          name: step.name,
          status: 'failed',
          error: error.message,
          duration: Date.now() - stepStartTime
        })
      }
    }

    return {
      success: results.every(r => r.status !== 'failed'),
      steps: results,
      totalDuration: Date.now() - startTime
    }
  }

  // Private helper methods
  private async executeAnalyticsStep(
    action: string,
    input: Record<string, any>,
    projectId: string
  ): Promise<any> {
    switch (action) {
      case 'track':
        return analyticsService.track({
          projectId,
          event: input.event,
          sessionId: input.sessionId || 'system',
          data: input.data
        })
      case 'getStats':
        return analyticsService.getStats(projectId, input.period)
      case 'getTrends':
        return analyticsService.getTrends(projectId, input.metric, input.period)
      default:
        throw new Error(`Unknown analytics action: ${action}`)
    }
  }

  private async executeSandboxStep(
    action: string,
    input: Record<string, any>,
    projectId: string,
    userId: string
  ): Promise<any> {
    switch (action) {
      case 'create':
        return sandboxService.create(projectId, userId, input.config)
      case 'exec':
        return sandboxService.exec(input.sandboxId, input.command, input.timeout)
      case 'writeFile':
        return sandboxService.writeFile(input.sandboxId, input.path, input.content)
      case 'readFile':
        return sandboxService.readFile(input.sandboxId, input.path)
      default:
        throw new Error(`Unknown sandbox action: ${action}`)
    }
  }

  private async executeDocumentStep(
    action: string,
    input: Record<string, any>,
    projectId: string
  ): Promise<any> {
    switch (action) {
      case 'processFiles':
        return pyService.processFiles(projectId, input.files)
      case 'processURL':
        return pyService.processURL(projectId, input.url)
      case 'generateGrowthAdvice':
        return pyService.generateGrowthAdvice(projectId, input.context)
      default:
        throw new Error(`Unknown document action: ${action}`)
    }
  }

  private async executeAIStep(
    action: string,
    input: Record<string, any>,
    projectId: string,
    userId: string
  ): Promise<any> {
    switch (action) {
      case 'chat':
        return aiEngine.chat({
          employeeId: input.employeeId,
          projectId,
          userId,
          message: input.message,
          context: input.context
        })
      case 'listEmployees':
        return aiEngine.listEmployees(input.department)
      case 'startDiscussion':
        return aiEngine.startDiscussion(
          projectId,
          userId,
          input.topic,
          input.employeeIds,
          input.initialMessage
        )
      default:
        throw new Error(`Unknown AI action: ${action}`)
    }
  }
}

// Export singleton instance
export const orchestrator = new MicroserviceOrchestrator()
