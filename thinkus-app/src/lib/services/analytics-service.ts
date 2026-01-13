import mongoose from 'mongoose'
import { AnalyticsEvent, type IAnalyticsEvent, type AnalyticsEventType } from '@/lib/db/models/analytics-event'

/**
 * 时间周期
 */
export interface Period {
  start: Date
  end: Date
}

/**
 * 项目统计数据
 */
export interface ProjectStats {
  users: {
    total: number
    new: number
    active: number
    change: number  // 百分比变化
  }
  pageViews: {
    total: number
    change: number
  }
  sessions: {
    total: number
    avgDuration: number  // 秒
    change: number
  }
  conversion: {
    rate: number
    change: number
  }
  engagement: {
    bounceRate: number
    avgSessionDuration: number
    pageViewsPerSession: number
  }
}

/**
 * 趋势数据
 */
export interface TrendData {
  date: string
  value: number
}

/**
 * 漏斗数据
 */
export interface FunnelStep {
  name: string
  count: number
  rate: number  // 转化率
  dropoff: number  // 流失率
}

/**
 * 行业基准
 */
export interface Benchmark {
  category: string
  conversionRate: number
  bounceRate: number
  avgSessionDuration: number
  pageViewsPerSession: number
}

// 行业基准数据
const INDUSTRY_BENCHMARKS: Record<string, Benchmark> = {
  ecommerce: {
    category: 'ecommerce',
    conversionRate: 3.5,
    bounceRate: 45,
    avgSessionDuration: 180,
    pageViewsPerSession: 4.2,
  },
  saas: {
    category: 'saas',
    conversionRate: 7,
    bounceRate: 35,
    avgSessionDuration: 240,
    pageViewsPerSession: 5.5,
  },
  content: {
    category: 'content',
    conversionRate: 2,
    bounceRate: 55,
    avgSessionDuration: 120,
    pageViewsPerSession: 2.8,
  },
  education: {
    category: 'education',
    conversionRate: 4,
    bounceRate: 40,
    avgSessionDuration: 300,
    pageViewsPerSession: 5,
  },
  default: {
    category: 'default',
    conversionRate: 5,
    bounceRate: 40,
    avgSessionDuration: 180,
    pageViewsPerSession: 3.5,
  },
}

/**
 * Analytics Service
 * 数据分析服务
 */
export class AnalyticsService {
  /**
   * 记录事件
   */
  async track(data: {
    projectId: mongoose.Types.ObjectId | string
    event: AnalyticsEventType | string
    sessionId: string
    url?: string
    referrer?: string
    userId?: string
    data?: Record<string, unknown>
    device?: {
      type: 'desktop' | 'mobile' | 'tablet'
      os?: string
      browser?: string
    }
    geo?: {
      country?: string
      city?: string
      timezone?: string
    }
  }): Promise<IAnalyticsEvent> {
    const projectId = typeof data.projectId === 'string'
      ? new mongoose.Types.ObjectId(data.projectId)
      : data.projectId

    return AnalyticsEvent.track({
      ...data,
      projectId,
    })
  }

  /**
   * 获取项目统计
   */
  async getStats(
    projectId: mongoose.Types.ObjectId | string,
    period: Period
  ): Promise<ProjectStats> {
    const pId = typeof projectId === 'string'
      ? new mongoose.Types.ObjectId(projectId)
      : projectId

    // 计算上一周期
    const periodLength = period.end.getTime() - period.start.getTime()
    const prevPeriod: Period = {
      start: new Date(period.start.getTime() - periodLength),
      end: period.start,
    }

    // 获取当前周期数据
    const [
      pageViews,
      sessions,
      users,
      prevPageViews,
      prevSessions,
      prevUsers,
      dailyStats,
    ] = await Promise.all([
      AnalyticsEvent.countEvents(pId, { start: period.start, end: period.end, event: 'page_view' }),
      AnalyticsEvent.getUniqueUsers(pId, { start: period.start, end: period.end }),
      this.getUniqueVisitors(pId, period),
      AnalyticsEvent.countEvents(pId, { start: prevPeriod.start, end: prevPeriod.end, event: 'page_view' }),
      AnalyticsEvent.getUniqueUsers(pId, { start: prevPeriod.start, end: prevPeriod.end }),
      this.getUniqueVisitors(pId, prevPeriod),
      AnalyticsEvent.getDailyStats(pId, { start: period.start, end: period.end }),
    ])

    // 计算转化
    const conversions = await AnalyticsEvent.countEvents(pId, {
      start: period.start,
      end: period.end,
      event: 'conversion',
    })
    const prevConversions = await AnalyticsEvent.countEvents(pId, {
      start: prevPeriod.start,
      end: prevPeriod.end,
      event: 'conversion',
    })

    const conversionRate = sessions > 0 ? (conversions / sessions) * 100 : 0
    const prevConversionRate = prevSessions > 0 ? (prevConversions / prevSessions) * 100 : 0

    // 计算参与度指标
    const engagement = await this.calculateEngagement(pId, period)

    return {
      users: {
        total: users,
        new: users, // 简化处理
        active: sessions,
        change: this.calculateChange(users, prevUsers),
      },
      pageViews: {
        total: pageViews,
        change: this.calculateChange(pageViews, prevPageViews),
      },
      sessions: {
        total: sessions,
        avgDuration: engagement.avgSessionDuration,
        change: this.calculateChange(sessions, prevSessions),
      },
      conversion: {
        rate: Math.round(conversionRate * 100) / 100,
        change: this.calculateChange(conversionRate, prevConversionRate),
      },
      engagement,
    }
  }

  /**
   * 获取趋势数据
   */
  async getTrends(
    projectId: mongoose.Types.ObjectId | string,
    metric: 'pageViews' | 'sessions' | 'users' | 'conversions',
    period: Period
  ): Promise<TrendData[]> {
    const pId = typeof projectId === 'string'
      ? new mongoose.Types.ObjectId(projectId)
      : projectId

    const dailyStats = await AnalyticsEvent.getDailyStats(pId, {
      start: period.start,
      end: period.end,
    })

    return dailyStats.map(day => ({
      date: day.date,
      value: metric === 'pageViews' ? day.pageViews
        : metric === 'sessions' ? day.sessions
        : metric === 'users' ? day.users
        : day.pageViews, // conversions 暂用 pageViews
    }))
  }

  /**
   * 获取转化漏斗
   */
  async getFunnel(
    projectId: mongoose.Types.ObjectId | string,
    steps: string[],
    period: Period
  ): Promise<FunnelStep[]> {
    const pId = typeof projectId === 'string'
      ? new mongoose.Types.ObjectId(projectId)
      : projectId

    const funnelData: FunnelStep[] = []

    for (let i = 0; i < steps.length; i++) {
      const count = await AnalyticsEvent.countEvents(pId, {
        start: period.start,
        end: period.end,
        event: steps[i],
      })

      const prevCount = i > 0 ? funnelData[i - 1].count : count
      const rate = prevCount > 0 ? (count / prevCount) * 100 : 0
      const dropoff = 100 - rate

      funnelData.push({
        name: steps[i],
        count,
        rate: Math.round(rate * 100) / 100,
        dropoff: Math.round(dropoff * 100) / 100,
      })
    }

    return funnelData
  }

  /**
   * 获取热门页面
   */
  async getTopPages(
    projectId: mongoose.Types.ObjectId | string,
    period: Period,
    limit = 10
  ): Promise<{ url: string; views: number }[]> {
    const pId = typeof projectId === 'string'
      ? new mongoose.Types.ObjectId(projectId)
      : projectId

    return AnalyticsEvent.getTopPages(pId, {
      start: period.start,
      end: period.end,
      limit,
    })
  }

  /**
   * 获取行业基准
   */
  getBenchmark(category: string): Benchmark {
    return INDUSTRY_BENCHMARKS[category] || INDUSTRY_BENCHMARKS.default
  }

  /**
   * 生成嵌入式跟踪代码
   */
  generateTrackingScript(projectId: string): string {
    return `
<!-- Thinkus Analytics -->
<script>
(function() {
  var THINKUS_PROJECT_ID = '${projectId}';
  var THINKUS_API = 'https://analytics.thinkus.ai';
  var SESSION_ID = 'ts_' + Date.now() + '_' + Math.random().toString(36).slice(2);

  function getDeviceType() {
    var ua = navigator.userAgent;
    if (/mobile/i.test(ua)) return 'mobile';
    if (/tablet/i.test(ua)) return 'tablet';
    return 'desktop';
  }

  function track(event, data) {
    var payload = {
      projectId: THINKUS_PROJECT_ID,
      event: event,
      sessionId: SESSION_ID,
      url: location.href,
      referrer: document.referrer,
      data: data || {},
      device: { type: getDeviceType() },
      timestamp: Date.now()
    };

    if (navigator.sendBeacon) {
      navigator.sendBeacon(THINKUS_API + '/track', JSON.stringify(payload));
    } else {
      fetch(THINKUS_API + '/track', {
        method: 'POST',
        body: JSON.stringify(payload),
        keepalive: true
      });
    }
  }

  // 页面访问
  track('page_view');

  // 暴露全局函数
  window.thinkusTrack = track;

  // 离开页面时记录
  window.addEventListener('beforeunload', function() {
    track('session_end');
  });
})();
</script>
<!-- End Thinkus Analytics -->
`.trim()
  }

  // ============ 私有方法 ============

  /**
   * 获取独立访客数
   */
  private async getUniqueVisitors(
    projectId: mongoose.Types.ObjectId,
    period: Period
  ): Promise<number> {
    const result = await AnalyticsEvent.aggregate([
      {
        $match: {
          projectId,
          timestamp: { $gte: period.start, $lte: period.end },
        },
      },
      { $group: { _id: '$userId' } },
      { $count: 'count' },
    ])

    return result[0]?.count || 0
  }

  /**
   * 计算参与度指标
   */
  private async calculateEngagement(
    projectId: mongoose.Types.ObjectId,
    period: Period
  ): Promise<{
    bounceRate: number
    avgSessionDuration: number
    pageViewsPerSession: number
  }> {
    // 获取会话数据
    const sessions = await AnalyticsEvent.aggregate([
      {
        $match: {
          projectId,
          timestamp: { $gte: period.start, $lte: period.end },
        },
      },
      {
        $group: {
          _id: '$sessionId',
          pageViews: { $sum: { $cond: [{ $eq: ['$event', 'page_view'] }, 1, 0] } },
          firstEvent: { $min: '$timestamp' },
          lastEvent: { $max: '$timestamp' },
        },
      },
    ])

    if (sessions.length === 0) {
      return {
        bounceRate: 0,
        avgSessionDuration: 0,
        pageViewsPerSession: 0,
      }
    }

    // 跳出率 (只有1个页面访问的会话)
    const bouncedSessions = sessions.filter(s => s.pageViews <= 1).length
    const bounceRate = (bouncedSessions / sessions.length) * 100

    // 平均会话时长
    const totalDuration = sessions.reduce((sum, s) => {
      const duration = (new Date(s.lastEvent).getTime() - new Date(s.firstEvent).getTime()) / 1000
      return sum + duration
    }, 0)
    const avgSessionDuration = totalDuration / sessions.length

    // 每会话页面浏览量
    const totalPageViews = sessions.reduce((sum, s) => sum + s.pageViews, 0)
    const pageViewsPerSession = totalPageViews / sessions.length

    return {
      bounceRate: Math.round(bounceRate * 100) / 100,
      avgSessionDuration: Math.round(avgSessionDuration),
      pageViewsPerSession: Math.round(pageViewsPerSession * 100) / 100,
    }
  }

  /**
   * 计算变化百分比
   */
  private calculateChange(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    const change = ((current - previous) / previous) * 100
    return Math.round(change * 100) / 100
  }
}

// 导出单例
export const analyticsService = new AnalyticsService()
