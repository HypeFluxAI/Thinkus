/**
 * Python Service gRPC Client
 * Document processing, requirement integration, growth advisor, experience
 */
import * as grpc from '@grpc/grpc-js'
import * as protoLoader from '@grpc/proto-loader'
import path from 'path'

const PY_SERVICE_URL = process.env.GRPC_PY_SERVICE_URL || 'localhost:50051'
const PROTO_DIR = path.join(process.cwd(), '..', 'services', 'proto')

// Types
export interface UploadedFile {
  name: string
  content: Buffer
  mime_type: string
}

export interface FeatureItem {
  name: string
  description: string
  priority: string
  tags: string[]
}

export interface UIElement {
  name: string
  type: string
  description: string
}

export interface DataField {
  name: string
  type: string
  description: string
  required: boolean
}

export interface Reference {
  type: string
  url: string
  description: string
}

export interface StructuredContent {
  content_type: string
  summary: string
  features: FeatureItem[]
  ui_elements: UIElement[]
  data_fields: DataField[]
  references: Reference[]
}

export interface ProcessedResult {
  file_name: string
  file_type: string
  raw_content: string
  structured?: StructuredContent
  error?: string
}

export interface IntegratedRequirement {
  summary: string
  features: FeatureItem[]
  tech_suggestions: string[]
  risks: string[]
  sources: string[]
}

export interface Implementation {
  type: string
  estimated_cost: number
  estimated_time: string
  difficulty: string
}

export interface GrowthAdvice {
  id: string
  type: string
  priority: string
  problem: string
  suggestion: string
  expected_impact: string
  metrics: string[]
  implementation: Implementation
}

export interface Experience {
  id: string
  type: string
  category: string
  title: string
  description: string
  complexity: string
  relevance_score: number
}

export interface CodeFile {
  path: string
  language: string
  content: string
}

// Client singleton
let client: any = null

/**
 * Get or create Python service client
 */
function getClient(): any {
  if (client) return client

  const protoPath = path.join(PROTO_DIR, 'document.proto')
  const packageDefinition = protoLoader.loadSync(protoPath, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
    includeDirs: [PROTO_DIR],
  })

  const proto = grpc.loadPackageDefinition(packageDefinition) as any
  client = new proto.thinkus.document.DocumentService(
    PY_SERVICE_URL,
    grpc.credentials.createInsecure()
  )

  return client
}

/**
 * Process uploaded files
 */
export async function processFiles(
  files: UploadedFile[],
  userId: string
): Promise<ProcessedResult[]> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.ProcessFiles(
      { files, user_id: userId },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.results || [])
        }
      }
    )
  })
}

/**
 * Process URL
 */
export async function processURL(url: string, userId: string): Promise<ProcessedResult> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.ProcessURL({ url, user_id: userId }, (error: grpc.ServiceError | null, response: any) => {
      if (error) {
        reject(error)
      } else {
        resolve(response)
      }
    })
  })
}

/**
 * Integrate requirements from documents
 */
export async function integrateRequirements(
  documents: ProcessedResult[],
  existingRequirement: string = '',
  useAI: boolean = true
): Promise<IntegratedRequirement> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.IntegrateRequirements(
      {
        documents,
        existing_requirement: existingRequirement,
        use_ai: useAI,
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
 * Generate growth advice for a project
 */
export async function generateGrowthAdvice(
  projectId: string,
  category: string = 'default',
  forceRefresh: boolean = false
): Promise<GrowthAdvice[]> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.GenerateGrowthAdvice(
      {
        project_id: projectId,
        category,
        force_refresh: forceRefresh,
      },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.advices || [])
        }
      }
    )
  })
}

/**
 * Match experiences
 */
export async function matchExperience(
  query: string,
  category: string = '',
  complexity: string = '',
  limit: number = 10
): Promise<Experience[]> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.MatchExperience(
      { query, category, complexity, limit },
      (error: grpc.ServiceError | null, response: any) => {
        if (error) {
          reject(error)
        } else {
          resolve(response.experiences || [])
        }
      }
    )
  })
}

/**
 * Add experience
 */
export async function addExperience(data: {
  userId: string
  projectId: string
  type: string
  category: string
  title: string
  description: string
  content: string
  codeFiles: CodeFile[]
}): Promise<Experience> {
  const client = getClient()

  return new Promise((resolve, reject) => {
    client.AddExperience(
      {
        user_id: data.userId,
        project_id: data.projectId,
        type: data.type,
        category: data.category,
        title: data.title,
        description: data.description,
        content: data.content,
        code_files: data.codeFiles,
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
 * Close client connection
 */
export function close(): void {
  if (client) {
    client.close()
    client = null
  }
}
