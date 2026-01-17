/**
 * gRPC Client Manager
 * Manages connections to microservices
 */
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'

// Service URLs from environment
const PY_SERVICE_URL = process.env.GRPC_PY_SERVICE_URL || 'localhost:50051'
const ANALYTICS_URL = process.env.GRPC_ANALYTICS_URL || 'localhost:50052'
const SANDBOX_URL = process.env.GRPC_SANDBOX_URL || 'localhost:50053'

// Proto file paths
const PROTO_DIR = path.join(process.cwd(), '..', 'services', 'proto')

// Proto loader options
const PROTO_OPTIONS: protoLoader.Options = {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
}

// Connection pool
const connections: Map<string, grpc.Client> = new Map()

/**
 * Load proto file and create client
 */
function loadProto(protoFile: string): grpc.GrpcObject {
  const protoPath = path.join(PROTO_DIR, protoFile)
  const packageDefinition = protoLoader.loadSync(protoPath, PROTO_OPTIONS)
  return grpc.loadPackageDefinition(packageDefinition)
}

/**
 * Get or create a gRPC client connection
 */
function getClient<T extends grpc.Client>(
  serviceName: string,
  ServiceClass: new (address: string, credentials: grpc.ChannelCredentials) => T,
  address: string
): T {
  const key = `${serviceName}:${address}`

  if (!connections.has(key)) {
    const client = new ServiceClass(address, grpc.credentials.createInsecure())
    connections.set(key, client)
  }

  return connections.get(key) as T
}

/**
 * Close all connections
 */
export function closeAllConnections(): void {
  connections.forEach((client) => {
    client.close()
  })
  connections.clear()
}

/**
 * Promisify a gRPC unary call
 */
export function promisifyUnary<TRequest, TResponse>(
  client: grpc.Client,
  method: (
    request: TRequest,
    callback: (error: grpc.ServiceError | null, response: TResponse) => void
  ) => grpc.ClientUnaryCall
): (request: TRequest) => Promise<TResponse> {
  return (request: TRequest): Promise<TResponse> => {
    return new Promise((resolve, reject) => {
      method.call(client, request, (error, response) => {
        if (error) {
          reject(error)
        } else {
          resolve(response)
        }
      })
    })
  }
}

/**
 * Promisify a gRPC server streaming call
 */
export function promisifyServerStream<TRequest, TResponse>(
  client: grpc.Client,
  method: (request: TRequest) => grpc.ClientReadableStream<TResponse>
): (request: TRequest) => AsyncIterable<TResponse> {
  return function (request: TRequest): AsyncIterable<TResponse> {
    const stream = method.call(client, request)

    return {
      [Symbol.asyncIterator](): AsyncIterator<TResponse> {
        return {
          next(): Promise<IteratorResult<TResponse>> {
            return new Promise((resolve, reject) => {
              stream.once('data', (data: TResponse) => {
                resolve({ value: data, done: false })
              })
              stream.once('end', () => {
                resolve({ value: undefined as unknown as TResponse, done: true })
              })
              stream.once('error', reject)
            })
          },
        }
      },
    }
  }
}

// Export service URLs
export { PY_SERVICE_URL, ANALYTICS_URL, SANDBOX_URL, PROTO_DIR, loadProto, getClient }
