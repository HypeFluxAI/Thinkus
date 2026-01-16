/**
 * Sandbox Service gRPC Client
 * Container management, file operations, command execution
 */
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'

const SANDBOX_URL = process.env.GRPC_SANDBOX_URL || 'localhost:50053'
const PROTO_DIR = path.join(process.cwd(), '..', 'services', 'proto')

// Types
export interface SandboxConfig {
  image?: 'node' | 'python' | 'full' | 'claude-code'
  cpuLimit?: number
  memoryLimit?: number // MB
  timeout?: number // seconds
}

export interface Sandbox {
  id: string
  project_id: string
  user_id: string
  status: 'creating' | 'running' | 'paused' | 'stopped' | 'error'
  image: string
  created_at: number
  last_active_at: number
}

export interface ExecResult {
  exit_code: number
  stdout: string
  stderr: string
  duration: number // milliseconds
}

export interface ExecOutput {
  type: 'stdout' | 'stderr'
  data: string
}

export interface FileInfo {
  name: string
  path: string
  is_directory: boolean
  size: number
  modified_at: number
}

export interface ExportedFile {
  path: string
  content: Buffer
}

export interface SandboxEvent {
  type: string
  sandbox_id: string
  timestamp: number
  payload: Buffer
}

// Client singleton
let client: any = null

/**
 * Get or create Sandbox service client
 */
function getClient(): any {
  if (client) return client

  const protoPath = path.join(PROTO_DIR, 'sandbox.proto')
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  })

  const proto = grpc.loadPackageDefinition(packageDefinition) as any
  client = new proto.thinkus.sandbox.SandboxService(
    SANDBOX_URL,
    grpc.credentials.createInsecure()
  )

  return client
}

/**
 * Create a new sandbox
 */
export async function create(
  projectId: string,
  userId: string,
  config?: SandboxConfig
): Promise<Sandbox> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.Create(
      {
        project_id: projectId,
        user_id: userId,
        config: config
          ? {
              image: config.image || 'node',
              cpu_limit: config.cpuLimit || 1000,
              memory_limit: config.memoryLimit || 512,
              timeout: config.timeout || 3600,
            }
          : undefined,
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
 * Get or create sandbox for a project
 */
export async function getOrCreate(
  projectId: string,
  userId: string,
  config?: SandboxConfig
): Promise<Sandbox> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.GetOrCreate(
      {
        project_id: projectId,
        user_id: userId,
        config: config
          ? {
              image: config.image || 'node',
              cpu_limit: config.cpuLimit || 1000,
              memory_limit: config.memoryLimit || 512,
              timeout: config.timeout || 3600,
            }
          : undefined,
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
 * Get sandbox by ID
 */
export async function get(sandboxId: string): Promise<Sandbox> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.Get({ sandbox_id: sandboxId }, (error: grpc.ServiceError | null, response: any) => {
      if (error) {
        reject(error)
      } else {
        resolve(response)
      }
    })
  })
}

/**
 * Execute command in sandbox
 */
export async function exec(
  sandboxId: string,
  command: string,
  timeout?: number
): Promise<ExecResult> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.Exec(
      {
        sandbox_id: sandboxId,
        command,
        timeout: timeout || 30,
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
 * Execute command with streaming output
 */
export function execStream(
  sandboxId: string,
  command: string,
  onOutput: (output: ExecOutput) => void,
  onError?: (error: Error) => void,
  onEnd?: () => void,
  timeout?: number
): () => void {
  const client = getClient()
  const stream = client.ExecStream({
    sandbox_id: sandboxId,
    command,
    timeout: timeout || 30,
  })

  stream.on('data', (output: ExecOutput) => {
    onOutput(output)
  })

  stream.on('error', (error: Error) => {
    if (onError) onError(error)
  })

  stream.on('end', () => {
    if (onEnd) onEnd()
  })

  return () => {
    stream.cancel()
  }
}

/**
 * Write file to sandbox
 */
export async function writeFile(
  sandboxId: string,
  filePath: string,
  content: string | Buffer
): Promise<void> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.WriteFile(
      {
        sandbox_id: sandboxId,
        path: filePath,
        content: typeof content === 'string' ? Buffer.from(content) : content,
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
 * Read file from sandbox
 */
export async function readFile(sandboxId: string, filePath: string): Promise<string> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.ReadFile(
      { sandbox_id: sandboxId, path: filePath },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.content.toString())
        }
      }
    )
  })
}

/**
 * List files in sandbox directory
 */
export async function listFiles(sandboxId: string, directory: string = '/'): Promise<FileInfo[]> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.ListFiles(
      { sandbox_id: sandboxId, directory },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.files || [])
        }
      }
    )
  })
}

/**
 * Pause sandbox
 */
export async function pause(sandboxId: string): Promise<void> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.Pause({ sandbox_id: sandboxId }, (error: grpc.ServiceError | null) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Resume sandbox
 */
export async function resume(sandboxId: string): Promise<void> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.Resume({ sandbox_id: sandboxId }, (error: grpc.ServiceError | null) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Destroy sandbox
 */
export async function destroy(sandboxId: string): Promise<void> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.Destroy({ sandbox_id: sandboxId }, (error: grpc.ServiceError | null) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

/**
 * Export sandbox files
 */
export async function exportSandbox(
  sandboxId: string
): Promise<{ files: ExportedFile[]; sandbox: Sandbox }> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.Export({ sandbox_id: sandboxId }, (error: grpc.ServiceError | null, response: any) => {
      if (error) {
        reject(error)
      } else {
        resolve({
          files: response.files || [],
          sandbox: response.sandbox,
        })
      }
    })
  })
}

/**
 * Subscribe to sandbox events
 */
export function subscribeEvents(
  sandboxId: string,
  onEvent: (event: SandboxEvent) => void,
  onError?: (error: Error) => void,
  onEnd?: () => void
): () => void {
  const client = getClient()
  const stream = client.SubscribeEvents({ sandbox_id: sandboxId })

  stream.on('data', (event: SandboxEvent) => {
    onEvent(event)
  })

  stream.on('error', (error: Error) => {
    if (onError) onError(error)
  })

  stream.on('end', () => {
    if (onEnd) onEnd()
  })

  return () => {
    stream.cancel()
  }
}

/**
 * Close client connection
 */
export function close(): void {
  if (client) {
    client.close()
    client = null
  }
}
