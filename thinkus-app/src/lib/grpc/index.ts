/**
 * gRPC Clients - Unified exports
 */

// Client manager
export { closeAllConnections, PY_SERVICE_URL, ANALYTICS_URL, SANDBOX_URL } from './client'

// Python service (document processing, AI analysis)
export * as pyService from './py-service'

// Analytics service (tracking, statistics)
export * as analyticsService from './analytics'

// Sandbox service (container management)
export * as sandboxService from './sandbox'

// Close all connections on process exit
if (typeof process !== 'undefined') {
  process.on('beforeExit', () => {
    import('./client').then(({ closeAllConnections }) => {
      closeAllConnections()
    })
  })
}
