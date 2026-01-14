/**
 * Analytics Service gRPC Client
 * Event tracking, statistics, trends, funnels
 */
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'

const ANALYTICS_URL = process.env.GRPC_ANALYTICS_URL || 'localhost:50052'
const PROTO_DIR = path.join(process.cwd(), '..', 'services', 'proto')

// Types
export interface Device {
  type: 'desktop' | 'mobile' | 'tablet'
  os?: string
  browser?: string
}

export interface Geo {
  country?: string
  city?: string
  timezone?: string
}

export interface TrackRequest {
  projectId: string
  event: string
  sessionId: string
  url?: string
  referrer?: string
  userId?: string
  data?: Record<string, string>
  device?: Device
  geo?: Geo
}

export interface Period {
  start: number // Unix timestamp
  end: number
}

export interface UserStats {
  total: number
  new: number
  active: number
  change: number
}

export interface PageViewStats {
  total: number
  change: number
}

export interface SessionStats {
  total: number
  avg_duration: number
  change: number
}

export interface ConversionStats {
  rate: number
  change: number
}

export interface EngagementStats {
  bounce_rate: number
  avg_session_duration: number
  page_views_per_session: number
}

export interface ProjectStats {
  users: UserStats
  page_views: PageViewStats
  sessions: SessionStats
  conversion: ConversionStats
  engagement: EngagementStats
}

export interface TrendData {
  date: string
  value: number
}

export interface FunnelStep {
  name: string
  count: number
  rate: number
  dropoff: number
}

export interface PageView {
  url: string
  views: number
}

export interface StreamEvent {
  type: string
  project_id: string
  timestamp: number
  payload: Buffer
}

// Client singletons
let analyticsClient: any = null
let realtimeClient: any = null

/**
 * Get or create Analytics service client
 */
function getAnalyticsClient(): any {
  if (analyticsClient) return analyticsClient

  const protoPath = path.join(PROTO_DIR, 'analytics.proto')
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  })

  const proto = grpc.loadPackageDefinition(packageDefinition) as any
  analyticsClient = new proto.thinkus.analytics.AnalyticsService(
    ANALYTICS_URL,
    grpc.credentials.createInsecure()
  )

  return analyticsClient
}

/**
 * Get or create Realtime service client
 */
function getRealtimeClient(): any {
  if (realtimeClient) return realtimeClient

  const protoPath = path.join(PROTO_DIR, 'analytics.proto')
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  })

  const proto = grpc.loadPackageDefinition(packageDefinition) as any
  realtimeClient = new proto.thinkus.analytics.RealtimeService(
    ANALYTICS_URL,
    grpc.credentials.createInsecure()
  )

  return realtimeClient
}

/**
 * Track an analytics event
 */
export async function track(request: TrackRequest): Promise<string> {
  const client = getAnalyticsClient()

  return new Promise((resolve, reject) => {
    client.Track(
      {
        project_id: request.projectId,
        event: request.event,
        session_id: request.sessionId,
        url: request.url,
        referrer: request.referrer,
        user_id: request.userId,
        data: request.data,
        device: request.device,
        geo: request.geo,
      },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.event_id)
        }
      }
    )
  })
}

/**
 * Track multiple events in batch
 */
export async function trackBatch(events: TrackRequest[]): Promise<void> {
  const client = getAnalyticsClient()

  return new Promise((resolve, reject) => {
    client.TrackBatch(
      {
        events: events.map((e) => ({
          project_id: e.projectId,
          event: e.event,
          session_id: e.sessionId,
          url: e.url,
          referrer: e.referrer,
          user_id: e.userId,
          data: e.data,
          device: e.device,
          geo: e.geo,
        })),
      },
      (error: grpc.ServiceError | null) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      }
    )
  })
}

/**
 * Get project statistics
 */
export async function getStats(projectId: string, period: Period): Promise<ProjectStats> {
  const client = getAnalyticsClient()

  return new Promise((resolve, reject) => {
    client.GetStats(
      {
        project_id: projectId,
        period: { start: period.start, end: period.end },
      },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      }
    )
  })
}

/**
 * Get trend data
 */
export async function getTrends(
  projectId: string,
  metric: 'pageViews' | 'sessions' | 'users' | 'conversions',
  period: Period
): Promise<TrendData[]> {
  const client = getAnalyticsClient()

  return new Promise((resolve, reject) => {
    client.GetTrends(
      {
        project_id: projectId,
        metric,
        period: { start: period.start, end: period.end },
      },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.data || [])
        }
      }
    )
  })
}

/**
 * Get conversion funnel
 */
export async function getFunnel(
  projectId: string,
  steps: string[],
  period: Period
): Promise<FunnelStep[]> {
  const client = getAnalyticsClient()

  return new Promise((resolve, reject) => {
    client.GetFunnel(
      {
        project_id: projectId,
        steps,
        period: { start: period.start, end: period.end },
      },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.steps || [])
        }
      }
    )
  })
}

/**
 * Get top pages
 */
export async function getTopPages(
  projectId: string,
  period: Period,
  limit: number = 10
): Promise<PageView[]> {
  const client = getAnalyticsClient()

  return new Promise((resolve, reject) => {
    client.GetTopPages(
      {
        project_id: projectId,
        period: { start: period.start, end: period.end },
        limit,
      },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.pages || [])
        }
      }
    )
  })
}

/**
 * Generate tracking script
 */
export async function generateTrackingScript(projectId: string): Promise<string> {
  const client = getAnalyticsClient()

  return new Promise((resolve, reject) => {
    client.GenerateTrackingScript(
      { project_id: projectId },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.script)
        }
      }
    )
  })
}

/**
 * Subscribe to real-time events
 */
export function subscribe(
  projectId: string,
  onEvent: (event: StreamEvent) => void,
  onError?: (error: Error) => void,
  onEnd?: () => void
): () => void {
  const client = getRealtimeClient()
  const stream = client.Subscribe({ project_id: projectId })

  stream.on('data', (event: StreamEvent) => {
    onEvent(event)
  })

  stream.on('error', (error: Error) => {
    if (onError) onError(error)
  })

  stream.on('end', () => {
    if (onEnd) onEnd()
  })

  // Return unsubscribe function
  return () => {
    stream.cancel()
  }
}

/**
 * Push an event to subscribers
 */
export async function push(projectId: string, type: string, payload: object): Promise<void> {
  const client = getRealtimeClient()

  return new Promise((resolve, reject) => {
    client.Push(
      {
        project_id: projectId,
        type,
        payload: Buffer.from(JSON.stringify(payload)),
      },
      (error: grpc.ServiceError | null) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      }
    )
  })
}

/**
 * Close client connections
 */
export function close(): void {
  if (analyticsClient) {
    analyticsClient.close()
    analyticsClient = null
  }
  if (realtimeClient) {
    realtimeClient.close()
    realtimeClient = null
  }
}
