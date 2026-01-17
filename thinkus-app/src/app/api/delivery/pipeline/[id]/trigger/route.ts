/**
 * 触发流水线执行 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { cicdPipelineService } from '@/lib/microservices';

/**
 * POST /api/delivery/pipeline/[id]/trigger - 触发流水线执行
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { id: pipelineId } = await params;
    const triggeredBy = session.user.email || session.user.name || 'manual';

    const result = await cicdPipelineService.triggerPipeline(pipelineId, triggeredBy);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || '触发流水线失败' },
        { status: result.statusCode || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      run: result.data,
      message: '流水线已触发',
    });
  } catch (error) {
    console.error('触发流水线错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
