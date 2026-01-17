/**
 * CI/CD 流水线 API
 * 集成 go-cicd-pipeline 微服务
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { cicdPipelineService } from '@/lib/microservices';

/**
 * POST /api/delivery/pipeline - 创建流水线
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const body = await req.json();
    const { projectId, name, template, triggers } = body;

    if (!projectId || !name || !template) {
      return NextResponse.json(
        { error: '缺少必要参数: projectId, name, template' },
        { status: 400 }
      );
    }

    const result = await cicdPipelineService.createPipeline({
      projectId,
      name,
      template,
      triggers,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '创建流水线失败' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pipeline: result.data,
      message: '流水线创建成功',
    });
  } catch (error) {
    console.error('创建流水线错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/delivery/pipeline - 获取流水线列表
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get('projectId') || undefined;

    const result = await cicdPipelineService.listPipelines(projectId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '获取流水线失败' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      pipelines: result.data?.pipelines || [],
    });
  } catch (error) {
    console.error('获取流水线错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
