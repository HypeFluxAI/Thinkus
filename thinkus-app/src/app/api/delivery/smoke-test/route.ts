/**
 * 冒烟测试 API
 * 集成 py-smoke-test 微服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { smokeTestService } from '@/lib/microservices';

/**
 * POST /api/delivery/smoke-test - 运行冒烟测试
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await req.json();
    const { baseUrl, productType, mode = 'quick', timeout, parallel } = body;

    if (!baseUrl) {
      return NextResponse.json(
        { error: '缺少必要参数: baseUrl' },
        { status: 400 }
      );
    }

    const config = {
      baseUrl,
      productType,
      timeout,
      parallel,
    };

    // 根据模式选择测试类型
    const result = mode === 'full'
      ? await smokeTestService.runFullTest(config)
      : await smokeTestService.runQuickTest(config);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '冒烟测试失败' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      report: result.data,
      message: `冒烟测试完成，通过率: ${result.data?.passRate}%`,
    });
  } catch (error) {
    console.error('冒烟测试错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/delivery/smoke-test - 获取测试报告或测试套件
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('reportId');

    if (reportId) {
      // 获取测试报告
      const result = await smokeTestService.getReport(reportId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || '获取报告失败' },
          { status: result.statusCode || 500 }
        );
      }
      return NextResponse.json({ success: true, report: result.data });
    }

    // 获取测试套件列表
    const result = await smokeTestService.getTestSuites();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '获取测试套件失败' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({ success: true, suites: result.data?.suites || [] });
  } catch (error) {
    console.error('获取测试信息错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
