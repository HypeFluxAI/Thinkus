/**
 * 交付队列 API
 * 集成 go-delivery-queue 微服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { deliveryQueueService } from '@/lib/microservices';

/**
 * POST /api/delivery/queue - 添加任务到交付队列
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, projectName, priority = 'normal', type = 'full' } = body;

    if (!projectId || !projectName) {
      return NextResponse.json(
        { error: '缺少必要参数: projectId, projectName' },
        { status: 400 }
      );
    }

    const result = await deliveryQueueService.enqueue({
      projectId,
      projectName,
      priority,
      type,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '添加到队列失败' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      task: result.data,
      message: '已添加到交付队列',
    });
  } catch (error) {
    console.error('交付队列错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/delivery/queue - 获取队列状态
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (projectId) {
      // 获取项目的队列任务
      const result = await deliveryQueueService.getProjectTasks(projectId);
      if (!result.success) {
        return NextResponse.json(
          { error: result.error || '获取任务失败' },
          { status: result.statusCode || 500 }
        );
      }
      return NextResponse.json({ success: true, tasks: result.data?.tasks || [] });
    }

    // 获取队列统计
    const result = await deliveryQueueService.getQueueStats();
    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '获取队列状态失败' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({ success: true, stats: result.data });
  } catch (error) {
    console.error('获取队列状态错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
