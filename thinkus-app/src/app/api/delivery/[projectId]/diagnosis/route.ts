import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import dbConnect from '@/lib/db/connection'
import { DeliverySession, Project } from '@/lib/db/models'

// 诊断类别配置
const DIAGNOSIS_CATEGORIES = {
  browser: {
    label: '浏览器环境',
    checks: ['userAgent', 'cookiesEnabled', 'localStorage', 'sessionStorage'],
  },
  network: {
    label: '网络状态',
    checks: ['online', 'connectionType', 'latency', 'bandwidth'],
  },
  performance: {
    label: '性能指标',
    checks: ['pageLoadTime', 'domContentLoaded', 'firstPaint', 'memoryUsage'],
  },
  api: {
    label: 'API 健康',
    checks: ['healthEndpoint', 'authEndpoint', 'dataEndpoint'],
  },
  storage: {
    label: '存储状态',
    checks: ['quotaUsage', 'indexedDB', 'serviceWorker'],
  },
}

// POST /api/delivery/[projectId]/diagnosis - 运行诊断
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params
  const body = await request.json()

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  await dbConnect()

  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: '项目不存在或无权限' }, { status: 403 })
  }

  const deliverySession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })

  // 收集客户端诊断数据
  const clientData = body.clientData || {}

  // 服务端诊断
  const serverDiagnosis: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    projectId,
    deliverySessionId: deliverySession?._id?.toString(),
  }

  // 检查产品 URL 可访问性
  if (deliverySession?.outputs?.productUrl) {
    try {
      const startTime = Date.now()
      const response = await fetch(deliverySession.outputs.productUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      })
      serverDiagnosis.productUrlCheck = {
        status: response.ok ? 'healthy' : 'error',
        statusCode: response.status,
        responseTime: Date.now() - startTime,
      }
    } catch (error) {
      serverDiagnosis.productUrlCheck = {
        status: 'error',
        message: error instanceof Error ? error.message : '无法访问',
      }
    }
  }

  // 检查 API 健康
  if (deliverySession?.outputs?.productUrl) {
    const apiUrl = `${deliverySession.outputs.productUrl}/api/health`
    try {
      const startTime = Date.now()
      const response = await fetch(apiUrl, {
        method: 'GET',
        signal: AbortSignal.timeout(10000),
      })
      const data = await response.json().catch(() => null)
      serverDiagnosis.apiHealthCheck = {
        status: response.ok ? 'healthy' : 'error',
        statusCode: response.status,
        responseTime: Date.now() - startTime,
        data,
      }
    } catch (error) {
      serverDiagnosis.apiHealthCheck = {
        status: 'error',
        message: error instanceof Error ? error.message : '无法访问',
      }
    }
  }

  // 生成诊断报告
  const issues: Array<{
    category: string
    severity: 'info' | 'warning' | 'error'
    title: string
    description: string
    suggestion: string
  }> = []

  // 分析客户端数据
  if (clientData.browser) {
    if (!clientData.browser.cookiesEnabled) {
      issues.push({
        category: 'browser',
        severity: 'warning',
        title: 'Cookie 已禁用',
        description: '您的浏览器禁用了 Cookie，这可能影响登录功能。',
        suggestion: '请在浏览器设置中启用 Cookie。',
      })
    }
    if (!clientData.browser.localStorage) {
      issues.push({
        category: 'browser',
        severity: 'warning',
        title: '本地存储不可用',
        description: '本地存储功能不可用，可能是隐私模式或浏览器限制。',
        suggestion: '请尝试退出隐私/无痕模式。',
      })
    }
  }

  if (clientData.network) {
    if (!clientData.network.online) {
      issues.push({
        category: 'network',
        severity: 'error',
        title: '网络离线',
        description: '您的设备当前处于离线状态。',
        suggestion: '请检查网络连接后重试。',
      })
    }
    if (clientData.network.latency && clientData.network.latency > 3000) {
      issues.push({
        category: 'network',
        severity: 'warning',
        title: '网络延迟较高',
        description: `当前网络延迟 ${clientData.network.latency}ms，可能影响使用体验。`,
        suggestion: '请尝试切换到更稳定的网络环境。',
      })
    }
  }

  // 分析服务端检查结果
  if (serverDiagnosis.productUrlCheck) {
    const check = serverDiagnosis.productUrlCheck as { status: string; responseTime?: number }
    if (check.status === 'error') {
      issues.push({
        category: 'api',
        severity: 'error',
        title: '产品无法访问',
        description: '无法访问您的产品网址，可能是服务暂时不可用。',
        suggestion: '请稍后重试，或联系客服获取帮助。',
      })
    } else if (check.responseTime && check.responseTime > 5000) {
      issues.push({
        category: 'performance',
        severity: 'warning',
        title: '响应较慢',
        description: `产品响应时间 ${check.responseTime}ms，超出正常范围。`,
        suggestion: '可能是高峰期导致，请稍后再试。',
      })
    }
  }

  // 计算健康分数
  const errorCount = issues.filter((i) => i.severity === 'error').length
  const warningCount = issues.filter((i) => i.severity === 'warning').length
  const healthScore = Math.max(0, 100 - errorCount * 30 - warningCount * 10)

  const report = {
    id: `diag_${Date.now()}`,
    timestamp: new Date().toISOString(),
    healthScore,
    healthStatus: healthScore >= 80 ? 'healthy' : healthScore >= 50 ? 'warning' : 'error',
    issues,
    categories: Object.entries(DIAGNOSIS_CATEGORIES).map(([key, config]) => {
      const categoryIssues = issues.filter((i) => i.category === key)
      return {
        id: key,
        label: config.label,
        status: categoryIssues.some((i) => i.severity === 'error')
          ? 'error'
          : categoryIssues.some((i) => i.severity === 'warning')
          ? 'warning'
          : 'healthy',
        issueCount: categoryIssues.length,
      }
    }),
    serverChecks: serverDiagnosis,
    clientData,
  }

  return NextResponse.json({
    message: '诊断完成',
    report,
  })
}

// GET /api/delivery/[projectId]/diagnosis - 获取快速健康状态
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const { projectId } = await params

  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  await dbConnect()

  const project = await Project.findById(projectId)
  if (!project || project.userId.toString() !== session.user.id) {
    return NextResponse.json({ error: '项目不存在或无权限' }, { status: 403 })
  }

  const deliverySession = await DeliverySession.findOne({ projectId }).sort({ createdAt: -1 })

  let healthStatus = 'unknown'
  let productUrl = null

  if (deliverySession?.outputs?.productUrl) {
    productUrl = deliverySession.outputs.productUrl
    try {
      const response = await fetch(productUrl, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      })
      healthStatus = response.ok ? 'healthy' : 'error'
    } catch {
      healthStatus = 'error'
    }
  }

  return NextResponse.json({
    status: healthStatus,
    productUrl,
    deliveryStage: deliverySession?.stage || 'unknown',
    deliveryStatus: deliverySession?.status || 'unknown',
  })
}
