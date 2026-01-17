/**
 * 灰度发布 API
 * 集成 go-canary-release 微服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { canaryReleaseService } from '@/lib/microservices';

/**
 * POST /api/delivery/canary - 创建灰度发布
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, deploymentId, strategy, preset } = body;

    if (!projectId || !deploymentId) {
      return NextResponse.json(
        { error: '缺少必要参数: projectId, deploymentId' },
        { status: 400 }
      );
    }

    const result = await canaryReleaseService.createRelease({
      projectId,
      deploymentId,
      strategy,
      preset,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '创建灰度发布失败' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      release: result.data,
      message: '灰度发布已创建',
    });
  } catch (error) {
    console.error('创建灰度发布错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/delivery/canary - 获取灰度发布列表
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: '缺少必要参数: projectId' },
        { status: 400 }
      );
    }

    const result = await canaryReleaseService.listReleases(projectId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '获取灰度发布列表失败' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      releases: result.data?.releases || [],
    });
  } catch (error) {
    console.error('获取灰度发布列表错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
