import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import dbConnect from '@/lib/db/connection'

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  version: string
  services: {
    database: {
      status: 'connected' | 'disconnected' | 'error'
      latency?: number
    }
    api: {
      status: 'running'
    }
  }
}

export async function GET() {
  const startTime = Date.now()

  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: {
        status: 'disconnected',
      },
      api: {
        status: 'running',
      },
    },
  }

  // Check database connection
  try {
    await dbConnect()
    const dbStartTime = Date.now()

    // Ping database
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.admin().ping()
      health.services.database = {
        status: 'connected',
        latency: Date.now() - dbStartTime,
      }
    } else {
      health.services.database.status = 'disconnected'
      health.status = 'degraded'
    }
  } catch (error) {
    console.error('Health check - DB error:', error)
    health.services.database.status = 'error'
    health.status = 'unhealthy'
  }

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
