/**
 * 自动回滚 API
 * 集成 go-auto-rollback 微服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { autoRollbackService } from '@/lib/microservices';

/**
 * POST /api/delivery/rollback - 注册回滚配置或触发回滚
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await req.json();
    const { action, projectId, config, reason } = body;

    // 根据 action 执行不同操作
    switch (action) {
      case 'register': {
        // 注册回滚配置
        if (!config) {
          return NextResponse.json(
            { error: '缺少必要参数: config' },
            { status: 400 }
          );
        }
        const result = await autoRollbackService.registerConfig(config);
        if (!result.success) {
          return NextResponse.json(
            { error: result.error || '注册配置失败' },
            { status: result.statusCode || 500 }
          );
        }
        return NextResponse.json({
          success: true,
          message: '回滚配置已注册',
        });
      }

      case 'startMonitor': {
        // 开始监控
        if (!projectId) {
          return NextResponse.json(
            { error: '缺少必要参数: projectId' },
            { status: 400 }
          );
        }
        const result = await autoRollbackService.startMonitoring(projectId);
        if (!result.success) {
          return NextResponse.json(
            { error: result.error || '启动监控失败' },
            { status: result.statusCode || 500 }
          );
        }
        return NextResponse.json({
          success: true,
          message: '监控已启动',
        });
      }

      case 'stopMonitor': {
        // 停止监控
        if (!projectId) {
          return NextResponse.json(
            { error: '缺少必要参数: projectId' },
            { status: 400 }
          );
        }
        const result = await autoRollbackService.stopMonitoring(projectId);
        if (!result.success) {
          return NextResponse.json(
            { error: result.error || '停止监控失败' },
            { status: result.statusCode || 500 }
          );
        }
        return NextResponse.json({
          success: true,
          message: '监控已停止',
        });
      }

      case 'trigger': {
        // 手动触发回滚
        if (!projectId) {
          return NextResponse.json(
            { error: '缺少必要参数: projectId' },
            { status: 400 }
          );
        }
        const result = await autoRollbackService.triggerRollback(projectId, reason);
        if (!result.success) {
          return NextResponse.json(
            { error: result.error || '触发回滚失败' },
            { status: result.statusCode || 500 }
          );
        }
        return NextResponse.json({
          success: true,
          record: result.data,
          message: '回滚已触发',
        });
      }

      default:
        return NextResponse.json(
          { error: '无效的 action，支持: register, startMonitor, stopMonitor, trigger' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('回滚操作错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/delivery/rollback - 获取监控状态或回滚历史
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');
    const recordId = searchParams.get('recordId');
    const type = searchParams.get('type') || 'status';

    if (recordId) {
      // 获取回滚记录
      const result = await autoRollbackService.getRollbackRecord(recordId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || '获取回滚记录失败' },
          { status: result.statusCode || 500 }
        );
      }
      return NextResponse.json({ success: true, record: result.data });
    }

    if (!projectId) {
      return NextResponse.json(
        { error: '缺少必要参数: projectId' },
        { status: 400 }
      );
    }

    if (type === 'history') {
      // 获取回滚历史
      const result = await autoRollbackService.getRollbackHistory(projectId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || '获取回滚历史失败' },
          { status: result.statusCode || 500 }
        );
      }
      return NextResponse.json({
        success: true,
        records: result.data?.records || [],
        count: result.data?.count || 0,
      });
    }

    // 获取监控状态
    const result = await autoRollbackService.getMonitoringStatus(projectId);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '获取监控状态失败' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({ success: true, status: result.data });
  } catch (error) {
    console.error('获取回滚信息错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
