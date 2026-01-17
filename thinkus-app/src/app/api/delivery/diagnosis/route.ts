import { NextRequest, NextResponse } from 'next/server'
import {
  oneclickDiagnosis,
  type DiagnosisConfig,
} from '@/lib/services'

/**
 * GET /api/delivery/diagnosis?reportId=xxx
 * 获取诊断报告
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const reportId = searchParams.get('reportId')

    if (!reportId) {
      return NextResponse.json(
        { error: '缺少 reportId 参数' },
        { status: 400 }
      )
    }

    const report = oneclickDiagnosis.getReport(reportId)

    if (!report) {
      return NextResponse.json(
        { error: '未找到诊断报告' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: report
    })
  } catch (error) {
    console.error('获取诊断报告失败:', error)
    return NextResponse.json(
      { error: '获取诊断报告失败' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/delivery/diagnosis
 * 执行诊断或提交报告
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, projectId, config, reportId, supportRequest } = body

    // 开始诊断
    if (action === 'start') {
      if (!projectId) {
        return NextResponse.json(
          { error: '缺少 projectId' },
          { status: 400 }
        )
      }

      const report = await oneclickDiagnosis.startDiagnosis(
        projectId,
        config as DiagnosisConfig
      )

      return NextResponse.json({
        success: true,
        data: report,
        message: '诊断完成'
      })
    }

    // 提交浏览器信息（从客户端收集）
    if (action === 'submitBrowserInfo') {
      if (!reportId) {
        return NextResponse.json(
          { error: '缺少 reportId' },
          { status: 400 }
        )
      }

      // 这里可以更新已有报告的浏览器信息
      const report = oneclickDiagnosis.getReport(reportId)
      if (!report) {
        return NextResponse.json(
          { error: '未找到诊断报告' },
          { status: 404 }
        )
      }

      // 合并浏览器信息
      if (body.browserInfo) {
        Object.assign(report.browser, body.browserInfo)
      }
      if (body.networkInfo) {
        Object.assign(report.network, body.networkInfo)
      }
      if (body.performanceInfo) {
        Object.assign(report.performance, body.performanceInfo)
      }

      return NextResponse.json({
        success: true,
        data: report,
        message: '浏览器信息已更新'
      })
    }

    // 发送给客服
    if (action === 'sendToSupport') {
      if (!reportId) {
        return NextResponse.json(
          { error: '缺少 reportId' },
          { status: 400 }
        )
      }

      const result = await oneclickDiagnosis.sendToSupport(reportId, supportRequest)

      return NextResponse.json({
        success: true,
        data: result,
        message: '已发送给客服'
      })
    }

    // 生成报告HTML
    if (action === 'generateHtml') {
      if (!reportId) {
        return NextResponse.json(
          { error: '缺少 reportId' },
          { status: 400 }
        )
      }

      const html = oneclickDiagnosis.generateReportHtml(reportId)

      return NextResponse.json({
        success: true,
        data: { html },
        message: 'HTML已生成'
      })
    }

    return NextResponse.json(
      { error: '未知操作' },
      { status: 400 }
    )
  } catch (error) {
    console.error('诊断操作失败:', error)
    return NextResponse.json(
      { error: '诊断操作失败' },
      { status: 500 }
    )
  }
}
