/**
 * 微服务健康检查 API
 * 检查所有交付相关微服务的健康状态
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/options';
import { checkAllServicesHealth, checkCriticalServices, microservices } from '@/lib/microservices';

/**
 * GET /api/delivery/health - 获取微服务健康状态
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: '请先登录' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') || 'critical';
    const service = searchParams.get('service');

    // 检查单个服务
    if (service) {
      const client = microservices[service as keyof typeof microservices];
      if (!client) {
        return NextResponse.json(
          { error: `未知服务: ${service}` },
          { status: 400 }
        );
      }

      const start = Date.now();
      const healthy = await client.healthCheck();
      const latency = Date.now() - start;

      return NextResponse.json({
        success: true,
        service,
        healthy,
        latency: healthy ? latency : undefined,
      });
    }

    // 检查所有服务或关键服务
    if (mode === 'all') {
      const services = await checkAllServicesHealth();
      const healthyCount = services.filter(s => s.healthy).length;

      return NextResponse.json({
        success: true,
        mode: 'all',
        totalServices: services.length,
        healthyServices: healthyCount,
        unhealthyServices: services.length - healthyCount,
        services,
        allHealthy: healthyCount === services.length,
      });
    }

    // 默认检查关键服务
    const { allHealthy, services } = await checkCriticalServices();

    return NextResponse.json({
      success: true,
      mode: 'critical',
      allHealthy,
      services,
      message: allHealthy ? '所有关键服务正常' : '部分关键服务不可用',
    });
  } catch (error) {
    console.error('健康检查错误:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '服务器错误' },
      { status: 500 }
    );
  }
}
